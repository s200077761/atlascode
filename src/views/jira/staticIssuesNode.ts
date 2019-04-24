import * as vscode from 'vscode';
import { Resources } from '../../resources';
import { JQLTreeDataProvider } from "./jqlTreeDataProvider";
import { BaseNode } from '../nodes/baseNode';

export class StaticIssuesNode extends JQLTreeDataProvider implements BaseNode {
    public disposables: vscode.Disposable[] = [];

    constructor(issueKeys: string[], private label: string) {
        super('PullRequestRelatedIssues', `issuekey in (${issueKeys.join(',')})`);
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = Resources.icons.get('issues');
        return item;
    }
}