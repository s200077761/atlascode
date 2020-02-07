import * as vscode from 'vscode';
import { Resources } from '../../resources';
import { JQLTreeDataProvider } from "./jqlTreeDataProvider";
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import uuid from 'uuid';
import { issueForKey } from '../../jira/issueForKey';
import { Logger } from '../../logger';

export class StaticIssuesNode extends JQLTreeDataProvider implements AbstractBaseNode {
    public disposables: vscode.Disposable[] = [];
    private collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    private issueKeys: string[] = [];

     constructor(issueKeys: string[], private label: string) {
        super(undefined, 'No issues found');
        this.collapsibleState = issueKeys.length > 1 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Expanded;
        this.issueKeys = issueKeys;
    }

    public async updateJqlEntry() {
        // for now we assume all issues share the same site
        if (this.issueKeys.length > 0) {
            try {
                const issue = await issueForKey(this.issueKeys[0]);
                this.setJqlEntry({ id: uuid.v4(), enabled: true, name: 'related issues', query: `issuekey in (${this.issueKeys.join(',')})`, siteId: issue.siteDetails.id, monitor: false });
                await this.executeQuery();
            } catch (e) {
                Logger.error(new Error(`error fetching related jira issues: ${e}`));
            }
        }
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(this.label, this.collapsibleState);
        item.iconPath = Resources.icons.get('issues');
        return item;
    }
}