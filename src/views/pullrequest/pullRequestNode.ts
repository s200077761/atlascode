import * as vscode from 'vscode';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { PullRequest, PaginatedPullRequests, PaginatedComments, PaginatedFileChanges, PaginatedCommits, Comment, FileChange, User } from '../../bitbucket/model';
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
    prHref: string;
    prId: number;
    participants: User[];
    repoUri: string;
    remote: Remote;
    branchName: string;
    commitHash: string;
    path: string;
    commentThreads: Comment[][];
}

export class PullRequestTitlesNode extends AbstractBaseNode {
    public prHref: string;

    constructor(private pr: PullRequest, private commentController: PullRequestCommentController) {
        super();
        this.prHref = pr.data!.url;
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem(`#${this.pr.data.id!} ${this.pr.data.title!}`, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = `#${this.pr.data.id!} ${this.pr.data.title!}`;
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

    private async createRelatedJiraIssueNode(commits: PaginatedCommits, allComments: PaginatedComments): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        const relatedIssuesNode = await RelatedIssuesNode.create(this.pr, commits.data, allComments.data);
        if (relatedIssuesNode) {
            result.push(relatedIssuesNode);
        }
        return result;
    }

    private async createRelatedBitbucketIssueNode(commits: PaginatedCommits, allComments: PaginatedComments): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        const relatedIssuesNode = await RelatedBitbucketIssuesNode.create(this.pr, commits.data, allComments.data);
        if (relatedIssuesNode) {
            result.push(relatedIssuesNode);
        }
        return result;
    }

    private async createFileChangesNodes(allComments: PaginatedComments, fileChanges: PaginatedFileChanges): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        const inlineComments = await this.getInlineComments(allComments.data);

        // Use merge base to diff from common ancestor of source and destination.
        // This will help ignore any unrelated changes in destination branch.
        const destination = `${this.pr.remote.name}/${this.pr.data.destination!.branchName}`;
        const source = `${this.pr.sourceRemote ? this.pr.sourceRemote.name : this.pr.remote.name}/${this.pr.data.source!.branchName}`;
        let mergeBase = this.pr.data.destination!.commitHash;
        try {
            mergeBase = await this.pr.repository.getMergeBase(destination, source);
        }
        catch (e) {
            Logger.debug('error getting merge base: ', e);
        }
        result.push(...fileChanges.data.map(fileChange => new PullRequestFilesNode(this.pr, mergeBase, fileChange, inlineComments, this.commentController)));
        if (fileChanges.next) {
            result.push(new SimpleNode('⚠️ All file changes are not shown. This PR has more file changes than what is supported by this extension.'));
        }
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

    constructor(private pr: PullRequest, private mergeBase: string, private fileChange: FileChange, private commentsMap: Map<string, Comment[][]>, private commentController: PullRequestCommentController) {
        super();
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const lhsFilePath = this.fileChange.oldPath;
        const rhsFilePath = this.fileChange.newPath;

        let fileDisplayName = '';
        const comments: Comment[][] = [];

        if (rhsFilePath && lhsFilePath && rhsFilePath !== lhsFilePath) {
            fileDisplayName = `${lhsFilePath} → ${rhsFilePath}`;
            comments.push(...(this.commentsMap.get(lhsFilePath) || []));
            comments.push(...(this.commentsMap.get(rhsFilePath) || []));
        } else if (rhsFilePath) {
            fileDisplayName = rhsFilePath;
            comments.push(...(this.commentsMap.get(rhsFilePath) || []));
        } else if (lhsFilePath) {
            fileDisplayName = lhsFilePath;
            comments.push(...(this.commentsMap.get(lhsFilePath) || []));
        }

        //@ts-ignore
        if (this.fileChange.status === 'merge conflict') {
            fileDisplayName = `⚠️ CONFLICTED: ${fileDisplayName}`;
        }

        let item = new vscode.TreeItem(`${comments.length > 0 ? '💬 ' : ''}${fileDisplayName}`, vscode.TreeItemCollapsibleState.None);
        item.tooltip = fileDisplayName;

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
                prHref: this.pr.data.url,
                prId: this.pr.data.id,
                participants: this.pr.data.participants,
                repoUri: this.pr.repository.rootUri.toString(),
                remote: this.pr.remote,
                branchName: this.pr.data.destination!.branchName,
                commitHash: this.mergeBase,
                path: lhsFilePath,
                commentThreads: lhsCommentThreads
            } as FileDiffQueryParams)
        };
        let rhsQueryParam = {
            query: JSON.stringify({
                lhs: false,
                prHref: this.pr.data.url,
                prId: this.pr.data.id,
                participants: this.pr.data.participants,
                repoUri: this.pr.repository.rootUri.toString(),
                remote: this.pr.sourceRemote || this.pr.remote,
                branchName: this.pr.data.source!.branchName,
                commitHash: this.pr.data.source!.commitHash,
                path: rhsFilePath,
                commentThreads: rhsCommentThreads
            } as FileDiffQueryParams)
        };
        switch (this.fileChange.status) {
            case 'added':
                item.iconPath = Resources.icons.get('add');
                lhsQueryParam = { query: JSON.stringify({}) };
                break;
            case 'removed':
                item.iconPath = Resources.icons.get('delete');
                rhsQueryParam = { query: JSON.stringify({}) };
                break;
            //@ts-ignore
            case 'merge conflict':
                item.iconPath = Resources.icons.get('warning');
                break;
            default:
                item.iconPath = Resources.icons.get('edit');
                break;
        }

        const lhsUri = vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(lhsQueryParam);
        const rhsUri = vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(rhsQueryParam);

        const diffArgs = [
            async () => {
                this.commentController.provideComments(lhsUri);
                this.commentController.provideComments(rhsUri);
            },
            lhsUri,
            rhsUri,
            fileDisplayName
        ];
        item.command = {
            command: Commands.ViewDiff,
            title: 'Diff file',
            arguments: diffArgs
        };

        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(`${this.pr.data.url}#chg-${fileDisplayName}`);

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