import * as vscode from 'vscode';
import { BaseNode } from './nodes/baseNode';
import { BitbucketContext } from '../bitbucket/context';
import { PullRequestApi } from '../bitbucket/pullRequests';
import { PullRequestTitlesNode, NextPageNode } from './nodes/pullRequestNode';
import { GitContentProvider } from './gitContentProvider';
import { PaginatedPullRequests } from '../bitbucket/model';
import { EmptyStateNode } from './nodes/emptyStateNode';

export class PullRequestNodeDataProvider implements vscode.TreeDataProvider<BaseNode>, vscode.Disposable {
    private _onDidChangeTreeData: vscode.EventEmitter<BaseNode | undefined> = new vscode.EventEmitter<BaseNode | undefined>();
    readonly onDidChangeTreeData: vscode.Event<BaseNode | undefined> = this._onDidChangeTreeData.event;
    private _children: BaseNode[] | undefined = undefined;

    static SCHEME = 'atlascode.bbpr';
    private _disposables: vscode.Disposable[] = [];

    constructor(private ctx: BitbucketContext) {
        this._disposables.push(vscode.workspace.registerTextDocumentContentProvider(PullRequestNodeDataProvider.SCHEME, new GitContentProvider(ctx.repository)));
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
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
        this.refresh();
    }

    getTreeItem(element: BaseNode): vscode.TreeItem {
        return element.getTreeItem();
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this._children) {
            let prs = await PullRequestApi.getList(this.ctx.repository);
            if (prs.data.length === 0) {
                return [new EmptyStateNode('No pull requests found for this repository')];
            }
            this._children = prs.data.map(pr => new PullRequestTitlesNode(pr));
            if (prs.next) { this._children!.push(new NextPageNode(prs)); }
        }
        return this._children!;
    }

    dispose() {
        this._disposables.forEach(disposable => { disposable.dispose(); });
    }
}