import * as vscode from 'vscode';
import { Resources } from '../../resources';
import { JQLTreeDataProvider } from "./jqlTreeDataProvider";
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import uuid from 'uuid';
import { issueForKey } from '../../jira/issueForKey';

export class StaticIssuesNode extends JQLTreeDataProvider implements AbstractBaseNode {
    public disposables: vscode.Disposable[] = [];

    constructor(issueKeys: string[], private label: string) {
        super(undefined, 'no issues found');
        this.updateJqlEntry(issueKeys);
    }

    private async updateJqlEntry(issueKeys: string[]) {
        // for now we assume all issues share the same site
        if (issueKeys.length > 0) {
            try {
                const issue = await issueForKey(issueKeys[0]);
                this.setJqlEntry({ id: uuid.v4(), enabled: true, name: 'related issues', query: `issuekey in (${issueKeys.join(',')})`, siteId: issue.siteDetails.id });
            } catch (e) {
                //just be empty
            }
        }
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.label, vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = Resources.icons.get('issues');
        return item;
    }
}