import * as path from 'path';
import * as vscode from 'vscode';
import { AbstractBaseNode } from "../nodes/abstractBaseNode";
import { Repository } from '../../typings/git';
import { BitbucketIssuesApi } from '../../bitbucket/bbIssues';
import { PaginatedBitbucketIssues, BitbucketIssue } from '../../bitbucket/model';
import { Resources } from '../../resources';
import { Commands } from '../../commands';
import { SimpleNode } from '../nodes/simpleNode';

export class BitbucketIssuesRepositoryNode extends AbstractBaseNode {
    private _children: AbstractBaseNode[] | undefined = undefined;

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
        this._children!.push(...issues.data.map(i => new BitbucketIssueNode(i)));
        if (issues.next) { this._children!.push(new NextPageNode(issues)); }
    }

    getTreeItem(): vscode.TreeItem {
        const directory = path.basename(this.repository.rootUri.fsPath);
        const item = new vscode.TreeItem(`${directory}`, this.expand ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = this.repository.rootUri.fsPath;

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this._children) {
            let issues = await BitbucketIssuesApi.getList(this.repository);
            if (issues.data.length === 0) {
                return [new SimpleNode('No open issues for this repository')];
            }
            this._children = issues.data.map(i => new BitbucketIssueNode(i));
            if (issues.next) { this._children!.push(new NextPageNode(issues)); }
        }
        return this._children;
    }
}

export class BitbucketIssueNode extends AbstractBaseNode {
    constructor(readonly issue: BitbucketIssue) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(`#${this.issue.id} ${this.issue.title!}`);
        treeItem.command = {
            command: Commands.ShowBitbucketIssue,
            title: 'Open bitbucket issue', arguments: [this.issue]
        };
        treeItem.contextValue = 'bitbucketIssue';
        treeItem.resourceUri = vscode.Uri.parse(this.issue.links!.html!.href!);
        return treeItem;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}

class NextPageNode extends AbstractBaseNode {
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

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}
