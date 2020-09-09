import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import * as path from 'path';
import * as vscode from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import {
    BitbucketSite,
    Comment,
    Commit,
    FileDiff,
    FileStatus,
    PaginatedComments,
    PaginatedPullRequests,
    PullRequest,
    Task,
    User,
} from '../../bitbucket/model';
import { Commands } from '../../commands';
import { configuration } from '../../config/configuration';
import { Logger } from '../../logger';
import { Resources } from '../../resources';
import { addTasksToCommentHierarchy } from '../../webview/common/pullRequestHelperActions';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { RelatedBitbucketIssuesNode } from '../nodes/relatedBitbucketIssuesNode';
import { RelatedIssuesNode } from '../nodes/relatedIssuesNode';
import { SimpleNode } from '../nodes/simpleNode';
import { DiffViewArgs, getArgsForDiffView } from './diffViewHelper';
import { PullRequestCommentController } from './prCommentController';

export const PullRequestContextValue = 'pullrequest';

export interface FileDiffQueryParams {
    lhs: boolean;
    repoUri: string;
    branchName: string;
    commitHash: string;
    path: string;
}

export interface PRFileDiffQueryParams extends FileDiffQueryParams {
    site: BitbucketSite;
    repoHref: string;
    prHref: string;
    prId: string;
    participants: User[];
    commentThreads: Comment[][];
    addedLines: number[];
    deletedLines: number[];
    lineContextMap: Object;
}

export class PullRequestTitlesNode extends AbstractBaseNode {
    private treeItem: vscode.TreeItem;
    public prHref: string;
    private childrenPromises: Promise<AbstractBaseNode[]>;

    constructor(
        private pr: PullRequest,
        private commentController: PullRequestCommentController,
        shouldPreload: boolean,
        parent: AbstractBaseNode | undefined
    ) {
        super(parent);
        this.treeItem = this.createTreeItem();
        this.prHref = pr.data!.url;

        //If the PR node belongs to a server repo, we don't want to preload it because we can't cache nodes based on update times.
        //BBServer update times omit actions like comments, task creation, etc. so we don't know if the PR we have is really up to date without
        //grabbing all the PR data. Due to rate limits imposed by BBServer admins, mass preloading of all nodes is not feasible without
        //caching.
        if (shouldPreload) {
            this.childrenPromises = this.fetchDataAndProcessChildren();
        }
    }

    private createTreeItem(): vscode.TreeItem {
        const approvalText = this.pr.data.participants
            .filter((p) => p.status === 'APPROVED')
            .map((approver) => `Approved-by: ${approver.displayName}`)
            .join('\n');

        let item = new vscode.TreeItem(
            `#${this.pr.data.id!} ${this.pr.data.title!}`,
            vscode.TreeItemCollapsibleState.Collapsed
        );
        item.tooltip = `#${this.pr.data.id!} ${this.pr.data.title!}${
            approvalText.length > 0 ? `\n\n${approvalText}` : ''
        }`;
        item.iconPath = vscode.Uri.parse(this.pr.data!.author!.avatarUrl);
        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(this.pr.data.url);
        item.description = `updated ${distanceInWordsToNow(this.pr.data.updatedTs, {
            addSuffix: true,
        })}`;

        return item;
    }

    getTreeItem(): vscode.TreeItem {
        return this.treeItem;
    }

    getPR() {
        return this.pr;
    }

    async fetchDataAndProcessChildren(): Promise<AbstractBaseNode[] | [SimpleNode]> {
        if (!this.pr) {
            return [];
        }

        const bbApi = await clientForSite(this.pr.site);
        let promises = Promise.all([
            bbApi.pullrequests.getChangedFiles(this.pr),
            bbApi.pullrequests.getCommits(this.pr),
            bbApi.pullrequests.getComments(this.pr),
            bbApi.pullrequests.getTasks(this.pr),
        ]);

        return promises.then(
            async (result) => {
                let [fileDiffs, commits, allComments, tasks] = result;

                const children: AbstractBaseNode[] = [new DescriptionNode(this.pr, this)];
                children.push(...(await this.createRelatedJiraIssueNode(commits, allComments)));
                children.push(...(await this.createRelatedBitbucketIssueNode(commits, allComments)));
                children.push(...(await this.createFileChangesNodes(allComments, fileDiffs, tasks)));
                return children;
            },
            (reason) => {
                Logger.debug('error fetching pull request details', reason);
                return [new SimpleNode('⚠️ Error: fetching pull request details failed')];
            }
        );
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (!element) {
            //If the promise is undefined, we didn't begin preloading in the constructor, so we need to make the full call here
            return await (this.childrenPromises ?? this.fetchDataAndProcessChildren());
        }
        return element.getChildren();
    }

    private async createRelatedJiraIssueNode(
        commits: Commit[],
        allComments: PaginatedComments
    ): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        const relatedIssuesNode = await RelatedIssuesNode.create(this.pr, commits, allComments.data);
        if (relatedIssuesNode) {
            result.push(relatedIssuesNode);
        }
        return result;
    }

    private async createRelatedBitbucketIssueNode(
        commits: Commit[],
        allComments: PaginatedComments
    ): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        const relatedIssuesNode = await RelatedBitbucketIssuesNode.create(this.pr, commits, allComments.data);
        if (relatedIssuesNode) {
            result.push(relatedIssuesNode);
        }
        return result;
    }

    private createdNestedFileStructure(diffViewData: DiffViewArgs, directory: PRDirectory) {
        const baseName = path.basename(diffViewData.fileDisplayData.fileDisplayName);
        const dirName = path.dirname(diffViewData.fileDisplayData.fileDisplayName);
        //If we just have a file, the dirName will be '.', but we don't want to tuck that in the '.' directory, so there's a ternary operation to deal with that
        const splitFileName = [...(dirName === '.' ? [] : dirName.split('/')), baseName];
        let currentDirectory = directory;
        for (let i = 0; i < splitFileName.length; i++) {
            if (i === splitFileName.length - 1) {
                currentDirectory.files.push(diffViewData); //The last name in the path is the name of the file, so we've reached the end of the file tree
            } else {
                //Traverse the file tree, and if a folder doesn't exist, add it
                if (!currentDirectory.subdirs.has(splitFileName[i])) {
                    currentDirectory.subdirs.set(splitFileName[i], {
                        name: splitFileName[i],
                        files: [],
                        subdirs: new Map<string, PRDirectory>(),
                    });
                }
                currentDirectory = currentDirectory.subdirs.get(splitFileName[i])!;
            }
        }
    }

    //Directories that contain only one child which is also a directory should be flattened. E.g A > B > C > D.txt => A/B/C/D.txt
    private flattenFileStructure(directory: PRDirectory) {
        // Keep flattening until there's nothing left to flatten, and only then move on to children.
        // The initial input is a dummy root directory with empty string as the name, which is ignored to maintain it as the root node.
        while (directory.name !== '' && directory.subdirs.size === 1 && directory.files.length === 0) {
            const currentFolderName: string = directory.name;
            const childDirectory = directory.subdirs.values().next().value;
            directory.name = `${currentFolderName}/${childDirectory.name ? childDirectory.name : ''}`;
            directory.subdirs = childDirectory.subdirs;
            directory.files = childDirectory.files;
        }
        for (const [, subdir] of directory.subdirs) {
            this.flattenFileStructure(subdir);
        }
    }

    private async createFileChangesNodes(
        allComments: PaginatedComments,
        fileDiffs: FileDiff[],
        tasks: Task[]
    ): Promise<AbstractBaseNode[]> {
        const allDiffData = await Promise.all(
            fileDiffs.map(async (fileDiff) => {
                const commentsWithTasks = { ...allComments, data: addTasksToCommentHierarchy(allComments.data, tasks) }; //Comments need to be infused with tasks now because they are gathered separately
                return await getArgsForDiffView(commentsWithTasks, fileDiff, this.pr, this.commentController);
            })
        );

        if (configuration.get<boolean>('bitbucket.explorer.nestFilesEnabled')) {
            //Create a dummy root directory data structure to hold the files
            let rootDirectory: PRDirectory = {
                name: '',
                files: [],
                subdirs: new Map<string, PRDirectory>(),
            };
            allDiffData.forEach((diffData) => this.createdNestedFileStructure(diffData, rootDirectory));
            this.flattenFileStructure(rootDirectory);

            //While creating the directory, we actually put all the files/folders inside of a root directory. We now want to go one level in.
            let directoryNodes: DirectoryNode[] = Array.from(
                rootDirectory.subdirs.values(),
                (subdir) => new DirectoryNode(subdir)
            );
            let childNodes: AbstractBaseNode[] = rootDirectory.files.map(
                (diffViewArg) => new PullRequestFilesNode(diffViewArg)
            );
            return childNodes.concat(directoryNodes);
        }

        const result: AbstractBaseNode[] = [];
        result.push(...allDiffData.map((diffData) => new PullRequestFilesNode(diffData)));
        if (allComments.next) {
            result.push(
                new SimpleNode(
                    '⚠️ All file comments are not shown. This PR has more comments than what is supported by this extension.'
                )
            );
        }
        return result;
    }
}

interface PRDirectory {
    name: string;
    files: DiffViewArgs[];
    subdirs: Map<string, PRDirectory>;
}

class DirectoryNode extends AbstractBaseNode {
    constructor(private directoryData: PRDirectory) {
        super();
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const item = new vscode.TreeItem(this.directoryData.name, vscode.TreeItemCollapsibleState.Expanded);
        item.tooltip = this.directoryData.name;
        item.iconPath = vscode.ThemeIcon.Folder;
        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        let directoryNodes: DirectoryNode[] = Array.from(
            this.directoryData.subdirs.values(),
            (subdir) => new DirectoryNode(subdir)
        );
        let fileNodes: AbstractBaseNode[] = this.directoryData.files.map(
            (diffViewArg) => new PullRequestFilesNode(diffViewArg)
        );
        return fileNodes.concat(directoryNodes);
    }
}

class PullRequestFilesNode extends AbstractBaseNode {
    constructor(private diffViewData: DiffViewArgs) {
        super();
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        let itemData = this.diffViewData.fileDisplayData;
        let fileDisplayString = itemData.fileDisplayName;
        if (configuration.get<boolean>('bitbucket.explorer.nestFilesEnabled')) {
            fileDisplayString = path.basename(itemData.fileDisplayName);
        }
        let item = new vscode.TreeItem(
            `${itemData.numberOfComments > 0 ? '💬 ' : ''}${fileDisplayString}`,
            vscode.TreeItemCollapsibleState.None
        );
        item.tooltip = itemData.fileDisplayName;
        item.command = {
            command: Commands.ViewDiff,
            title: 'Diff file',
            arguments: this.diffViewData.diffArgs,
        };

        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(`${itemData.prUrl}#chg-${itemData.fileDisplayName}`);
        switch (itemData.fileDiffStatus) {
            case FileStatus.ADDED:
                item.iconPath = Resources.icons.get('add-circle');
                break;
            case FileStatus.DELETED:
                item.iconPath = Resources.icons.get('delete');
                break;
            //@ts-ignore
            case FileStatus.CONFLICT:
                item.iconPath = Resources.icons.get('warning');
                break;
            default:
                item.iconPath = Resources.icons.get('edit');
                break;
        }

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}

export class DescriptionNode extends AbstractBaseNode {
    constructor(private pr: PullRequest, parent?: AbstractBaseNode | undefined) {
        super(parent);
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem('Details', vscode.TreeItemCollapsibleState.None);
        item.tooltip = 'Open pull request details';
        item.iconPath = Resources.icons.get('detail');

        item.command = {
            command: Commands.BitbucketShowPullRequestDetails,
            title: 'Open pull request details',
            arguments: [this.pr],
        };

        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(this.pr.data.url);

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}

export class NextPageNode extends AbstractBaseNode {
    constructor(private prs: PaginatedPullRequests) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem('Load next page', vscode.TreeItemCollapsibleState.None);
        item.iconPath = Resources.icons.get('more');

        item.command = {
            command: Commands.BitbucketPullRequestsNextPage,
            title: 'Load pull requests next page',
            arguments: [this.prs],
        };

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}
