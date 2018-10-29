import * as vscode from 'vscode';
import { JiraIssue } from '../../jira/jiraIssue';
import { issuesForJQL } from '../../commands/jira/issuesForJQL';

export class JiraOutlineProvider implements vscode.TreeDataProvider<JiraIssue> {
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private issues: JiraIssue[] = [];
    private jql: string;

    constructor(jql:string) {
        this.jql = jql;
    }

    getChildren(offset?: JiraIssue): Promise<JiraIssue[]> {
        if (offset) {
            return Promise.resolve([]);
        } else if (this.issues.length > 0) {
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
        return issuesForJQL(this.jql)
        .then(newIssues => {
            this.issues = newIssues;
            this._onDidChangeTreeData.fire();
            return newIssues;
        });
    }
}