import * as vscode from 'vscode';
import { BaseNode } from "./baseNode";
import { PullRequestApi } from "../../bitbucket/pullRequests";
import { Repository } from '../../typings/git';
import { EmptyStateNode } from './emptyStateNode';
import { PullRequestTitlesNode, NextPageNode } from './pullRequestNode';
import { PaginatedPullRequests } from '../../bitbucket/model';

export class RepositoriesNode extends BaseNode {
    private _children: BaseNode[] | undefined = undefined;

    constructor(private repository: Repository) {
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
        const item = new vscode.TreeItem(`${directory}`, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = this.repository.rootUri.path;
        item.contextValue = 'pullrequest';

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