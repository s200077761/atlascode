import * as vscode from 'vscode';
import { BaseNode } from './nodes/baseNode';
import { BitbucketContext } from '../bitbucket/context';
import { PullRequest } from '../bitbucket/pullRequests';
import { PullRequestTitlesNode } from './nodes/pullRequestNode';
import { GitContentProvider } from './gitContentProvider';

export class PullRequestNodeDataProvider implements vscode.TreeDataProvider<BaseNode>, vscode.Disposable {
    private _onDidChangeTreeData: vscode.EventEmitter<BaseNode | undefined> = new vscode.EventEmitter<BaseNode | undefined>();
    readonly onDidChangeTreeData: vscode.Event<BaseNode | undefined> = this._onDidChangeTreeData.event;

    static SCHEME = 'atlascode.bbpr';
    private _disposables: vscode.Disposable[] = [];

    constructor(private ctx: BitbucketContext) {
        this._disposables.push(vscode.workspace.registerTextDocumentContentProvider(PullRequestNodeDataProvider.SCHEME, new GitContentProvider(ctx.repository)));
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: BaseNode): vscode.TreeItem {
        return element.getTreeItem();
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (!element) {
            let prs = await PullRequest.getPullRequests(this.ctx.repository);
            return prs.map(pr => new PullRequestTitlesNode(pr));
        } else {
            return element.getChildren();
        }
    }

    dispose() {
        this._disposables.forEach(disposable => { disposable.dispose(); });
    }
}