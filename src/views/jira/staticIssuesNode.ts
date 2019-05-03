import * as vscode from 'vscode';
import { Resources } from '../../resources';
import { JQLTreeDataProvider } from "./jqlTreeDataProvider";
import { AbstractBaseNode } from '../nodes/abstractBaseNode';

export class StaticIssuesNode extends JQLTreeDataProvider implements AbstractBaseNode {
    public disposables: vscode.Disposable[] = [];

    constructor(issueKeys: string[], private label: string) {
        super(`issuekey in (${issueKeys.join(',')})`, 'PullRequestRelatedIssues');
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = Resources.icons.get('issues');
        return item;
    }
}