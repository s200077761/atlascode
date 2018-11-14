import * as vscode from 'vscode';
import { issuesForJQL } from '../../commands/jira/issuesForJQL';
import { Logger } from '../../logger';
import { Issue } from '../../jira/jiraModel';
import { BaseNode } from '../nodes/baseNode';
import { IssueNode } from '../nodes/issueNode';
import { EmptyStateNode } from '../nodes/emptyStateNode';

export class JiraOutlineProvider implements vscode.TreeDataProvider<IssueNode> {
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private _issues: Issue[] | undefined;
    private _jql: string | undefined;

    constructor(private _emptyState = "No issues") {}

    refresh() {
        Logger.debug("Refreshing treeView");
        this._issues = undefined;
        this._onDidChangeTreeData.fire();
    }

    setJql(jql: string) {
        this._jql = jql;
        this.refresh();
    }

    getChildren(parent?: BaseNode): Promise<IssueNode[]> {
        if (parent || !this._jql) {
            return Promise.resolve([new EmptyStateNode(this._emptyState)]);
        } else if (this._issues) {
            return Promise.resolve(this.nodesForIssues());
        } else {
            return this.fetchIssues();
        }
    }

    getTreeItem(node: BaseNode): vscode.TreeItem {
        return node.getTreeItem();
    }
    
    private async fetchIssues(): Promise<IssueNode[]> {
        if (!this._jql) {
            return Promise.resolve([]);
        }
        return issuesForJQL(this._jql)
        .then(newIssues => {
            this._issues = newIssues;
            this._onDidChangeTreeData.fire();
            return this.nodesForIssues();
        });
    }

    private nodesForIssues(): IssueNode[] {
        if (this._issues && this._issues.length > 0) {
            return this._issues.map((issue) => new IssueNode(issue));
        } else {
            return [new EmptyStateNode(this._emptyState)];
        }
    }
}
