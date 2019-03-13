import * as vscode from 'vscode';
import { PullRequestApi } from '../../bitbucket/pullRequests';
import { BaseNode } from './baseNode';
import { PullRequest, PaginatedPullRequests, PaginatedComments, PaginatedFileChanges } from '../../bitbucket/model';
import { Resources } from '../../resources';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { Commands } from '../../commands';
import { Remote } from '../../typings/git';
import { RelatedIssuesNode } from './relatedIssuesNode';
import { EmptyStateNode } from './emptyStateNode';
import { Logger } from '../../logger';

export const PullRequestContextValue = 'pullrequest';

interface NestedComment {
    data: Bitbucket.Schema.Comment;
    children: NestedComment[];
}

export interface FileDiffQueryParams {
    lhs: boolean;
    prId: number;
    repoUri: string;
    remote: Remote;
    branchName: string;
    commitHash: string;
    path: string;
    commentThreads: Bitbucket.Schema.Comment[][];
}

export class PullRequestTitlesNode extends BaseNode {
    constructor(private pr: PullRequest) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem(`#${this.pr.data.id!} ${this.pr.data.title!}`, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = `#${this.pr.data.id!} ${this.pr.data.title!}`;
        item.iconPath = vscode.Uri.parse(this.pr.data!.author!.links!.avatar!.href!);
        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(this.pr.data.links!.html!.href!);

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (!element) {
            if (!this.pr) { return []; }

            this.pr = await this.hydratePullRequest(this.pr);

            let promises = Promise.all([
                PullRequestApi.getChangedFiles(this.pr),
                PullRequestApi.getComments(this.pr)
            ]);

            return promises.then(
                async result => {
                    let [fileChanges, allComments] = result;

                    const children: BaseNode[] = [new DescriptionNode(this.pr)];
                    children.push(...await this.createRelatedJiraIssueNode(allComments));
                    children.push(...await this.createFileChangesNodes(allComments, fileChanges));
                    return children;
                },
                reason => {
                    Logger.debug('error fetching pull request details', reason);
                    return [new EmptyStateNode('⚠️ Error: fetching pull request details failed')];
                });
        } else {
            return element.getChildren();
        }
    }

    // hydratePullRequest fetches the specific pullrequest by id to fill in the missing details.
    // This is needed because when a repo's pullrequests list is fetched, the response may not have all fields populated.
    private async hydratePullRequest(pr: PullRequest): Promise<PullRequest> {
        return await PullRequestApi.get(pr);
    }

    private async createRelatedJiraIssueNode(allComments: PaginatedComments): Promise<BaseNode[]> {
        const result: BaseNode[] = [];
        const relatedIssuesNode = await RelatedIssuesNode.create(this.pr, allComments.data);
        if (relatedIssuesNode) {
            result.push(relatedIssuesNode);
        }
        return result;
    }

    private async createFileChangesNodes(allComments: PaginatedComments, fileChanges: PaginatedFileChanges): Promise<BaseNode[]> {
        const result: BaseNode[] = [];
        const inlineComments = await this.getInlineComments(allComments.data);
        result.push(...fileChanges.data.map(fileChange => new PullRequestFilesNode(this.pr, fileChange, inlineComments)));
        if (fileChanges.next) {
            result.push(new EmptyStateNode('⚠️ All file changes are not shown. This PR has more file changes than what is supported by this extension.'));
        }
        return result;
    }

    private async getInlineComments(allComments: Bitbucket.Schema.Comment[]): Promise<Map<string, Bitbucket.Schema.Comment[][]>> {
        const inlineComments = this.toNestedList(allComments);
        const threads: Map<string, Bitbucket.Schema.Comment[][]> = new Map();

        inlineComments.forEach(val => {
            if (!threads.get(val.data.inline!.path)) {
                threads.set(val.data.inline!.path, []);
            }
            threads.get(val.data.inline!.path)!.push(this.traverse(val));
        });

        return threads;
    }

    private traverse(n: NestedComment): Bitbucket.Schema.Comment[] {
        let result: Bitbucket.Schema.Comment[] = [];
        result.push(n.data);
        for (let i = 0; i < n.children.length; i++) {
            result.push(...this.traverse(n.children[i]));
        }

        return result;
    }

    private toNestedList(comments: Bitbucket.Schema.Comment[]): Map<Number, NestedComment> {
        const inlineComments = comments.filter(c => c.inline);
        const inlineCommentsTreeMap = new Map<Number, NestedComment>();
        inlineComments.forEach(c => inlineCommentsTreeMap.set(c.id!, { data: c, children: [] }));
        inlineComments.forEach(c => {
            const n = inlineCommentsTreeMap.get(c.id!);
            const pid = c.parent && c.parent.id;
            if (pid && inlineCommentsTreeMap.get(pid)) {
                inlineCommentsTreeMap.get(pid)!.children.push(n!);
            }
        });

        const result = new Map<Number, NestedComment>();
        inlineCommentsTreeMap.forEach((val, key) => {
            if (!val.data.parent) {
                result.set(key, val);
            }
        });

        return result;
    }
}

class PullRequestFilesNode extends BaseNode {
    constructor(private pr: PullRequest, private fileChange: Bitbucket.Schema.Diffstat, private commentsMap: Map<string, Bitbucket.Schema.Comment[][]>) {
        super();
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        let fileDisplayName = '';
        switch (this.fileChange.status) {
            case 'removed':
                fileDisplayName = this.fileChange.old!.path!;
                break;
            case 'renamed':
                fileDisplayName = `${this.fileChange.old!.path!} → ${this.fileChange.new!.path!}`;
                break;
            case 'added':
            case 'modified':
            default:
                fileDisplayName = this.fileChange.new!.path!;
                break;
        }

        const comments: Bitbucket.Schema.Comment[][] = [];
        if (this.fileChange.old && this.commentsMap.has(this.fileChange.old!.path!)) {
            comments.push(...this.commentsMap.get(this.fileChange.old!.path!)!);
        }
        if (this.fileChange.new && this.commentsMap.has(this.fileChange.new!.path!)) {
            comments.push(...this.commentsMap.get(this.fileChange.new!.path!)!);
        }

        let item = new vscode.TreeItem(`${comments.length > 0 ? '💬 ' : ''}${fileDisplayName}`, vscode.TreeItemCollapsibleState.None);
        item.tooltip = fileDisplayName;

        let lhsCommentThreads: Bitbucket.Schema.Comment[][] = [];
        let rhsCommentThreads: Bitbucket.Schema.Comment[][] = [];

        comments.forEach((c: Bitbucket.Schema.Comment[]) => {
            const parentComment = c[0];
            if (parentComment.inline!.from) {
                lhsCommentThreads.push(c);
            } else {
                rhsCommentThreads.push(c);
            }
        });

        // Use merge base to diff from common ancestor of source and destination.
        // This will help ignore any unrelated changes in destination branch.
        const destination = `${this.pr.remote.name}/${this.pr.data.destination!.branch!.name!}`;
        const source = `${this.pr.remote.name}/${this.pr.data.destination!.branch!.name!}`;
        const mergeBase = await this.pr.repository.getMergeBase(destination, source);
        let lhsQueryParam = {
            query: JSON.stringify({
                lhs: true,
                prId: this.pr.data.id,
                repoUri: this.pr.repository.rootUri.toString(),
                remote: this.pr.remote,
                branchName: this.pr.data.destination!.branch!.name!,
                commitHash: mergeBase,
                path: this.fileChange.old ? this.fileChange.old.path! : undefined,
                commentThreads: lhsCommentThreads
            } as FileDiffQueryParams)
        };
        let rhsQueryParam = {
            query: JSON.stringify({
                lhs: false,
                prId: this.pr.data.id,
                repoUri: this.pr.repository.rootUri.toString(),
                remote: this.pr.sourceRemote || this.pr.remote,
                branchName: this.pr.data.source!.branch!.name!,
                commitHash: this.pr.data.source!.commit!.hash!,
                path: this.fileChange.new ? this.fileChange.new.path! : undefined,
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
            default:
                item.iconPath = Resources.icons.get('edit');
                break;
        }

        const diffArgs = [
            vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(lhsQueryParam),
            vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${fileDisplayName}`).with(rhsQueryParam),
            fileDisplayName
        ];
        item.command = {
            command: Commands.ViewDiff,
            title: 'Diff file',
            arguments: diffArgs
        };

        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(`${this.pr.data.links!.html!.href!}#chg-${fileDisplayName}`);

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        return [];
    }
}

class DescriptionNode extends BaseNode {
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
        item.resourceUri = vscode.Uri.parse(this.pr.data.links!.html!.href!);

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        return [];
    }
}

export class NextPageNode extends BaseNode {
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

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        return [];
    }
}