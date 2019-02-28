import * as vscode from 'vscode';
import { BaseNode } from "./baseNode";
import { PullRequestApi, GitUrlParse } from "../../bitbucket/pullRequests";
import { Repository } from '../../typings/git';
import { EmptyStateNode } from './emptyStateNode';
import { PullRequestTitlesNode, NextPageNode, PullRequestContextValue } from './pullRequestNode';
import { PaginatedPullRequests } from '../../bitbucket/model';

export class RepositoriesNode extends BaseNode {
    private _children: BaseNode[] | undefined = undefined;

    constructor(private repository: Repository, private expand?: boolean) {
        super();
    }

    addItems(prs: PaginatedPullRequests): void {
        if (!this._children) {
            this._children = [];
        }
        if (this._children.length > 0 && this._children[this._children.length - 1] instanceof NextPageNode) {
            this._children.pop();
        }
        this._children!.push(...prs.data.map(pr => new PullRequestTitlesNode(pr)));
        if (prs.next) { this._children!.push(new NextPageNode(prs)); }
    }

    getTreeItem(): vscode.TreeItem {
        const directory = this.repository.rootUri.path.split('/').pop();
        const item = new vscode.TreeItem(`${directory}`, this.expand ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = this.repository.rootUri.path;
        item.contextValue = PullRequestContextValue;
        const remote = PullRequestApi.getBitbucketRemotes(this.repository)[0];
        const repoName = GitUrlParse(remote.fetchUrl! || remote.pushUrl!).full_name;
        const prUrl = `https://bitbucket.org/${repoName}/pull-requests`;
        item.resourceUri = vscode.Uri.parse(prUrl);

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this._children) {
            let prs = await PullRequestApi.getList(this.repository);
            if (prs.data.length === 0) {
                return [new EmptyStateNode('No pull requests found for this repository')];
            }
            this._children = prs.data.map(pr => new PullRequestTitlesNode(pr));
            if (prs.next) { this._children!.push(new NextPageNode(prs)); }
        }
        return this._children;
    }
}