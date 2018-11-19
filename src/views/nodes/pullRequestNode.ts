import * as vscode from 'vscode';
import { PullRequestApi } from '../../bitbucket/pullRequests';
import { BaseNode } from './baseNode';
import { PullRequest, PaginatedPullRequests } from '../../bitbucket/model';
import { Resources } from '../../resources';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { Commands } from '../../commands';

interface Node {
    data: Bitbucket.Schema.Comment;
    children: Node[];
}

export class PullRequestTitlesNode extends BaseNode {
    constructor(private pr: PullRequest) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem(`#${this.pr.data.id!} ${this.pr.data.title!}`, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = `#${this.pr.data.id!} ${this.pr.data.title!}`;
        item.iconPath = vscode.Uri.parse(this.pr.data!.author!.links!.avatar!.href!);
        item.contextValue = 'pullrequest';

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (!element) {
            if (!this.pr) { return []; }
            // When a repo's pullrequests are fetched, the response may not have all fields populated.
            // Fetch the specific pullrequest by id to fill in the missing details.
            this.pr = await PullRequestApi.get(this.pr);
            const fileChanges: any[] = await PullRequestApi.getChangedFiles(this.pr);
            const inlineComments = await this.fetchComments();
            console.log(inlineComments.keys);
            return [
                new DescriptionNode(this.pr),
                ...fileChanges.map(fileChange => new PullRequestFilesNode(this.pr, { ...fileChange, comments: inlineComments.get(fileChange.filename) }))
            ];
        } else {
            return element.getChildren();
        }
    }

    private async fetchComments(): Promise<Map<string, Bitbucket.Schema.Comment[][]>> {
        const allComments = await PullRequestApi.getComments(this.pr);
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

    private traverse(n: Node): Bitbucket.Schema.Comment[] {
        let result: Bitbucket.Schema.Comment[] = [];
        result.push(n.data);
        for (let i = 0; i < n.children.length; i++) {
            result.push(...this.traverse(n.children[i]));
        }

        return result;
    }

    private toNestedList(comments: Bitbucket.Schema.Comment[]): Map<Number, Node> {
        const inlineComments = comments.filter(c => c.inline);
        const inlineCommentsTreeMap = new Map<Number, Node>();
        inlineComments.forEach(c => inlineCommentsTreeMap.set(c.id!, { data: c, children: [] }));
        inlineComments.forEach(c => {
            const n = inlineCommentsTreeMap.get(c.id!);
            const pid = c.parent && c.parent.id;
            if (pid && inlineCommentsTreeMap.get(pid)) {
                inlineCommentsTreeMap.get(pid)!.children.push(n!);
            }
        });

        const result = new Map<Number, Node>();
        inlineCommentsTreeMap.forEach((val, key) => {
            if (!val.data.parent) {
                result.set(key, val);
            }
        });

        return result;
    }
}

class PullRequestFilesNode extends BaseNode {
    constructor(private pr: PullRequest, private fileChange: any) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem(this.fileChange.filename, vscode.TreeItemCollapsibleState.None);
        let lhsCommentThreads: Bitbucket.Schema.Comment[][] = [];
        let rhsCommentThreads: Bitbucket.Schema.Comment[][] = [];

        if (this.fileChange.comments) {
            this.fileChange.comments.forEach((c: Bitbucket.Schema.Comment[]) => {
                const parentComment = c[0];
                if (parentComment.inline!.from) {
                    lhsCommentThreads.push(c);
                } else {
                    rhsCommentThreads.push(c);
                }
            });
        }

        let lhsQueryParam = {
            query: JSON.stringify({
                repoUri: this.pr.repository.rootUri.toString(),
                remote: this.pr.remote.name,
                branch: this.pr.data.destination!.branch!.name!,
                path: this.fileChange.filename,
                commit: this.pr.data.destination!.commit!.hash!,
                commentThreads: lhsCommentThreads
            })
        };
        let rhsQueryParam = {
            query: JSON.stringify({
                repoUri: this.pr.repository.rootUri.toString(),
                remote: this.pr.remote.name,
                branch: this.pr.data.source!.branch!.name!,
                path: this.fileChange.filename,
                commit: this.pr.data.source!.commit!.hash!,
                commentThreads: rhsCommentThreads
            })
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

        item.command = {
            command: 'vscode.diff',
            title: 'Diff file',
            arguments: [
                vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${this.fileChange.filename}`).with(lhsQueryParam),
                vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${this.fileChange.filename}`).with(rhsQueryParam),
                this.fileChange.filename
            ]
        };

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
        item.iconPath = Resources.icons.get('detail');

        item.command = {
            command: Commands.BitbucketShowPullRequestDetails,
            title: 'Open pull request details',
            arguments: [this.pr]
        };

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