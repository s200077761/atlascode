import * as vscode from 'vscode';
import { JiraIssue } from '../../jira/jiraIssue';
import { issuesForJQL } from '../../commands/jira/issuesForJQL';
import { Logger } from '../../logger';
import { Commands } from '../../commands';

export class JiraOutlineProvider implements vscode.TreeDataProvider<JiraIssue.Issue> {
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private issues: JiraIssue.Issue[] | undefined;
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

    getChildren(parent?: JiraIssue.Issue): Promise<JiraIssue.Issue[]> {
        if (parent || !this.jql) {
            return Promise.resolve([]);
        } else if (this.issues) {
            return Promise.resolve(this.issues);               
        } else {
            return this.fetchIssues();
        }
    }

    getTreeItem(issue: JiraIssue.Issue): vscode.TreeItem {
        let treeItem = new vscode.TreeItem(`${issue.summary}`, vscode.TreeItemCollapsibleState.None);
        treeItem.command = { command: Commands.ShowIssue, title: "Show Issue", arguments: [issue], };
        treeItem.iconPath = vscode.Uri.parse(issue.issueType.iconUrl);

        Logger.debug("treeIcon is",treeItem.iconPath);
        return treeItem;
    }
    
    private async fetchIssues(): Promise<JiraIssue.Issue[]> {
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