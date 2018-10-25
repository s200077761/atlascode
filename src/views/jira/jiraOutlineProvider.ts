import * as vscode from 'vscode';
import { JiraIssue } from '../../jira/jiraIssue';
import { issuesForJQL } from '../../commands/jira/issuesForJQL';
import { Logger } from '../../logger';

export class JiraOutlineProvider implements vscode.TreeDataProvider<JiraIssue> {
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private issues: JiraIssue[] | undefined;
    private jql: string | undefined;

    refresh() {
        Logger.debug("Refreshing treeView");
        this.issues = undefined;
        this._onDidChangeTreeData.fire();
    }

    setJql(jql: string) {
        this.jql = jql;
        this.refresh();
    }

    getChildren(parent?: JiraIssue): Promise<JiraIssue[]> {
        if (parent || !this.jql) {
            return Promise.resolve([]);
        } else if (this.issues) {
            return Promise.resolve(this.issues);               
        } else {
            return this.fetchIssues();
        }
    }

    getTreeItem(issue: JiraIssue): vscode.TreeItem {
        let treeItem = new vscode.TreeItem(`${issue.summary}`, vscode.TreeItemCollapsibleState.None);
        treeItem.command = { command: 'jiraOutline.showIssue', title: "Show Issue", arguments: [issue], };
        treeItem.iconPath = vscode.Uri.parse(issue.issueIcon);
        return treeItem;
    }
    
    private async fetchIssues(): Promise<JiraIssue[]> {
        if (!this.jql) {
            return Promise.resolve([]);
        }
        return issuesForJQL(this.jql)
        .then(newIssues => {
            this.issues = newIssues;
            this._onDidChangeTreeData.fire();
            return newIssues;
        });
    }
}