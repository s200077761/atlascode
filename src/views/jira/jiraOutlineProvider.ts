import * as vscode from 'vscode';
import { issuesForJQL } from '../../commands/jira/issuesForJQL';
import { Logger } from '../../logger';
import { Commands } from '../../commands';
import { Issue } from '../../jira/jiraModel';

export class JiraOutlineProvider implements vscode.TreeDataProvider<Issue> {
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private issues: Issue[] | undefined;
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

    getChildren(parent?: Issue): Promise<Issue[]> {
        if (parent || !this.jql) {
            return Promise.resolve([]);
        } else if (this.issues) {
            return Promise.resolve(this.issues);               
        } else {
            return this.fetchIssues();
        }
    }

    getTreeItem(issue: Issue): vscode.TreeItem {
        let treeItem = new vscode.TreeItem(`${issue.summary}`, vscode.TreeItemCollapsibleState.None);
        treeItem.command = { command: Commands.ShowIssue, title: "Show Issue", arguments: [issue], };
        treeItem.iconPath = vscode.Uri.parse(issue.issueType.iconUrl);
        treeItem.contextValue = issue.key;
        return treeItem;
    }
    
    private async fetchIssues(): Promise<Issue[]> {
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
