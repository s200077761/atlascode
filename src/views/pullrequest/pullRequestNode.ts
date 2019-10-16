import * as vscode from 'vscode';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { PullRequest, PaginatedPullRequests, PaginatedComments, Comment, FileChange, User, Commit } from '../../bitbucket/model';
import { Resources } from '../../resources';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { Commands } from '../../commands';
import { Remote } from '../../typings/git';
import { RelatedIssuesNode } from '../nodes/relatedIssuesNode';
import { Logger } from '../../logger';
import { RelatedBitbucketIssuesNode } from '../nodes/relatedBitbucketIssuesNode';
import { PullRequestCommentController } from './prCommentController';
import { SimpleNode } from '../nodes/simpleNode';
import { clientForRemote } from '../../bitbucket/bbUtils';

export const PullRequestContextValue = 'pullrequest';

export interface FileDiffQueryParams {
    lhs: boolean;
    repoUri: string;
    branchName: string;
    commitHash: string;
    path: string;
}

export interface PRFileDiffQueryParams extends FileDiffQueryParams {
    prHref: string;
    prId: number;
    remote: Remote;
    participants: User[];
    commentThreads: Comment[][];
}

export class PullRequestTitlesNode extends AbstractBaseNode {
    public prHref: string;

    constructor(private pr: PullRequest, private commentController: PullRequestCommentController) {
        super();
        this.prHref = pr.data!.url;
    }

    getTreeItem(): vscode.TreeItem {
        const approvalText = this.pr.data.participants
            .filter(p => p.status === 'APPROVED')
            .map(approver => `Approved-by: ${approver.displayName}`)
            .join('\n');

        let item = new vscode.TreeItem(`#${this.pr.data.id!} ${this.pr.data.title!}`, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = `#${this.pr.data.id!} ${this.pr.data.title!}${approvalText.length > 0 ? `\n\n${approvalText}` : ''}`;
        item.iconPath = vscode.Uri.parse(this.pr.data!.author!.avatarUrl);
        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(this.pr.data.url);

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (!element) {
            if (!this.pr) { return []; }

            this.pr = await this.hydratePullRequest(this.pr);

            const bbApi = await clientForRemote(this.pr.remote);
            let promises = Promise.all([
                bbApi.pullrequests.getChangedFiles(this.pr),
                bbApi.pullrequests.getCommits(this.pr),
                bbApi.pullrequests.getComments(this.pr)
            ]);

            return promises.then(
                async result => {
                    let [fileChanges, commits, allComments] = result;

                    const children: AbstractBaseNode[] = [new DescriptionNode(this.pr)];
                    children.push(...await this.createRelatedJiraIssueNode(commits, allComments));
                    children.push(...await this.createRelatedBitbucketIssueNode(commits, allComments));
                    children.push(...await this.createFileChangesNodes(allComments, fileChanges));
                    return children;
                },
                reason => {
                    Logger.debug('error fetching pull request details', reason);
                    return [new SimpleNode('⚠️ Error: fetching pull request details failed')];
                });
        } else {
            return element.getChildren();
        }
    }

    // hydratePullRequest fetches the specific pullrequest by id to fill in the missing details.
    // This is needed because when a repo's pullrequests list is fetched, the response may not have all fields populated.
    private async hydratePullRequest(pr: PullRequest): Promise<PullRequest> {
        const bbApi = await clientForRemote(this.pr.remote);
        return await bbApi.pullrequests.get(pr);
    }

    private async createRelatedJiraIssueNode(commits: Commit[], allComments: PaginatedComments): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        const relatedIssuesNode = await RelatedIssuesNode.create(this.pr, commits, allComments.data);
        if (relatedIssuesNode) {
            result.push(relatedIssuesNode);
        }
        return result;
    }

    private async createRelatedBitbucketIssueNode(commits: Commit[], allComments: PaginatedComments): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        const relatedIssuesNode = await RelatedBitbucketIssuesNode.create(this.pr, commits, allComments.data);
        if (relatedIssuesNode) {
            result.push(relatedIssuesNode);
        }
        return result;
    }

    public async getArgsForDiffView(allComments: PaginatedComments, fileChange: FileChange, includeDataForNode?: boolean): Promise<any> {
        const commentsMap = await this.getInlineComments(allComments.data);
        const pr = this.pr;
        const commentController = this.commentController;
    
        // Use merge base to diff from common ancestor of source and destination.
        // This will help ignore any unrelated changes in destination branch.
        const destination = `${pr.remote.name}/${pr.data.destination!.branchName}`;
        const source = `${pr.sourceRemote ? pr.sourceRemote.name : pr.remote.name}/${pr.data.source!.branchName}`;
        let mergeBase = pr.data.destination!.commitHash;
        try {
            mergeBase = await this.pr.repository.getMergeBase(destination, source);
        }
        catch (e) {
            Logger.debug('error getting merge base: ', e);
        }

        const lhsFilePath = fileChange.oldPath;
        const rhsFilePath = fileChange.newPath;

        let fileDisplayName = '';
        const comments: Comment[][] = [];

        if (rhsFilePath && lhsFilePath && rhsFilePath !== lhsFilePath) {
            fileDisplayName = `${lhsFilePath} → ${rhsFilePath}`;
            comments.push(...(commentsMap.get(lhsFilePath) || []));
            comments.push(...(commentsMap.get(rhsFilePath) || []));
        } else if (rhsFilePath) {
            fileDisplayName = rhsFilePath;
            comments.push(...(commentsMap.get(rhsFilePath) || []));
        } else if (lhsFilePath) {
            fileDisplayName = lhsFilePath;
            comments.push(...(commentsMap.get(lhsFilePath) || []));
        }

        //@ts-ignore
        if (fileChange.status === 'merge conflict') {
            fileDisplayName = `⚠️ CONFLICTED: ${fileDisplayName}`;
        }

        let lhsCommentThreads: Comment[][] = [];
        let rhsCommentThreads: Comment[][] = [];

        comments.forEach((c: Comment[]) => {
            const parentComment = c[0];
            if (parentComment.inline!.from) {
                lhsCommentThreads.push(c);
            } else {
                rhsCommentThreads.push(c);
            }
        });

        let lhsQueryParam = {
            query: JSON.stringify({
                lhs: true,
                prHref: pr.data.url,
                prId: pr.data.id,
                participants: pr.data.participants,
                repoUri: pr.repository.rootUri.toString(),
                remote: pr.remote,
                branchName: pr.data.destination!.branchName,
                commitHash: mergeBase,
                path: lhsFilePath,
                commentThreads: lhsCommentThreads
            } as PRFileDiffQueryParams)
        };
        let rhsQueryParam = {
            query: JSON.stringify({
                lhs: false,
                prHref: pr.data.url,
                prId: pr.data.id,
                participants: pr.data.participants,
                repoUri: pr.repository.rootUri.toString(),
                remote: pr.sourceRemote || pr.remote,
                branchName: pr.data.source!.branchName,
                commitHash: pr.data.source!.commitHash,
                path: rhsFilePath,
                commentThreads: rhsCommentThreads
            } as PRFileDiffQueryParams)
        };

        const lhsUri = vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(lhsQueryParam);
        const rhsUri = vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(rhsQueryParam);

        const diffArgs = [
            async () => {
                commentController.provideComments(lhsUri);
                commentController.provideComments(rhsUri);
            },
            lhsUri,
            rhsUri,
            fileDisplayName
        ];
        if (includeDataForNode){
            return {
                diffArgs: diffArgs, 
                dataOnlyForItem: {
                    prUrl: pr.data.url, 
                    fileDisplayName: fileDisplayName,
                    lhsQueryParam: lhsQueryParam,
                    rhsQueryParam: rhsQueryParam,
                    fileChangeStatus: fileChange.status,
                    numberOfComments: comments.length
                }
            };
        } else {
            return diffArgs;
        }
    }

    private async createFileChangesNodes(allComments: PaginatedComments, fileChanges: FileChange[]): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        result.push(
            ...await Promise.all(
                fileChanges.map(async (fileChange) => 
                    {
                        const diffViewData = await this.getArgsForDiffView(allComments, fileChange, true);
                        return new PullRequestFilesNode(diffViewData);
                    }
                )
            )
        );
        if (allComments.next) {
            result.push(new SimpleNode('⚠️ All file comments are not shown. This PR has more comments than what is supported by this extension.'));
        }
        return result;
    }

    private async getInlineComments(allComments: Comment[]): Promise<Map<string, Comment[][]>> {
        const inlineComments = allComments.filter(c => c.inline && c.inline.path);

        const threads: Map<string, Comment[][]> = new Map();

        inlineComments.forEach(val => {
            if (!threads.get(val.inline!.path)) {
                threads.set(val.inline!.path, []);
            }
            threads.get(val.inline!.path)!.push(this.traverse(val));
        });

        return threads;
    }

    private traverse(n: Comment): Comment[] {
        let result: Comment[] = [];
        result.push(n);
        for (let i = 0; i < n.children.length; i++) {
            result.push(...this.traverse(n.children[i]));
        }

        return result;
    }
}

class PullRequestFilesNode extends AbstractBaseNode {

    constructor(private diffViewData: any) {
        super();
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        let itemData = this.diffViewData.dataOnlyForItem;
        let item = new vscode.TreeItem(`${itemData.numberOfComments > 0 ? '💬 ' : ''}${itemData.fileDisplayName}`, vscode.TreeItemCollapsibleState.None);
        item.tooltip = itemData.fileDisplayName;
        item.command = {
            command: Commands.ViewDiff,
            title: 'Diff file',
            arguments: this.diffViewData.diffArgs
        };

        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(`file:///${itemData.prUrl}#chg-${itemData.fileDisplayName}`);
        switch (itemData.fileChangeStatus) {
            case 'added':
                item.iconPath = Resources.icons.get('add');
                itemData.lhsQueryParam = { query: JSON.stringify({}) };
                break;
            case 'removed':
                item.iconPath = Resources.icons.get('delete');
                itemData.rhsQueryParam = { query: JSON.stringify({}) };
                break;
            //@ts-ignore
            case 'merge conflict':
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

class DescriptionNode extends AbstractBaseNode {
    constructor(private pr: PullRequest) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem('Details', vscode.TreeItemCollapsibleState.None);
        item.tooltip = 'Open pull request details';
        item.iconPath = Resources.icons.get('detail');

        item.command = {
            command: Commands.BitbucketShowPullRequestDetails,
            title: 'Open pull request details',
            arguments: [this.pr]
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
            arguments: [this.prs]
        };

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}