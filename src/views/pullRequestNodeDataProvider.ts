import * as vscode from 'vscode';
import { BaseNode } from './nodes/baseNode';
import { BitbucketContext } from '../bitbucket/context';
import { getPullRequests } from '../bitbucket/pullRequests';
import { PullRequestTitlesNode } from './nodes/pullRequestNode';

export class PullRequestNodeDataProvider implements vscode.TreeDataProvider<BaseNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<BaseNode | undefined> = new vscode.EventEmitter<BaseNode | undefined>();
    readonly onDidChangeTreeData: vscode.Event<BaseNode | undefined> = this._onDidChangeTreeData.event;

    constructor(private ctx: BitbucketContext) {
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: BaseNode): vscode.TreeItem {
        return element.getTreeItem();
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (!element) {
            let prs = await getPullRequests(this.ctx.repository);
            return prs.map(pr => new PullRequestTitlesNode(pr));
        } else {
            return element.getChildren();
        }
    }
}