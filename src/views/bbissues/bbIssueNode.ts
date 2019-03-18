import * as vscode from 'vscode';
import { BaseNode } from "../nodes/baseNode";
import { Repository } from '../../typings/git';
import { EmptyStateNode } from '../nodes/emptyStateNode';
import { BitbucketIssuesApi } from '../../bitbucket/bbIssues';
import { PaginatedBitbucketIssues } from '../../bitbucket/model';
import { Resources } from '../../resources';
import { Commands } from '../../commands';

export class BitbucketIssuesRepositoryNode extends BaseNode {
    private _children: BaseNode[] | undefined = undefined;

    constructor(private repository: Repository, private expand?: boolean) {
        super();
    }

    addItems(issues: PaginatedBitbucketIssues): void {
        if (!this._children) {
            this._children = [];
        }
        if (this._children.length > 0 && this._children[this._children.length - 1] instanceof NextPageNode) {
            this._children.pop();
        }
        this._children!.push(...issues.data.map(i => new EmptyStateNode(`#${i.id} ${i.title!}`, { command: 'vscode.open', title: 'Open issue on website', arguments: [vscode.Uri.parse(i.links!.html!.href!)] })));
        if (issues.next) { this._children!.push(new NextPageNode(issues)); }
    }

    getTreeItem(): vscode.TreeItem {
        const directory = this.repository.rootUri.path.split('/').pop();
        const item = new vscode.TreeItem(`${directory}`, this.expand ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = this.repository.rootUri.path;

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this._children) {
            let issues = await BitbucketIssuesApi.getList(this.repository);
            if (issues.data.length === 0) {
                return [new EmptyStateNode('No open issues for this repository')];
            }
            this._children = issues.data.map(i => new EmptyStateNode(`#${i.id} ${i.title!}`, { command: 'vscode.open', title: 'Open issue on website', arguments: [vscode.Uri.parse(i.links!.html!.href!)] }));
            if (issues.next) { this._children!.push(new NextPageNode(issues)); }
        }
        return this._children;
    }
}

class NextPageNode extends BaseNode {
    constructor(private issues: PaginatedBitbucketIssues) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem('Load next page', vscode.TreeItemCollapsibleState.None);
        item.iconPath = Resources.icons.get('more');

        item.command = {
            command: Commands.BitbucketIssuesNextPage,
            title: 'Load issues next page',
            arguments: [this.issues]
        };

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        return [];
    }
}