import * as vscode from "vscode";
import { BaseNode } from "./baseNode";
import { Issue } from "../../jira/jiraIssue";
import { Commands } from "../../commands";

const IssueNodeContextValue = 'jiraIssue';

export class IssueNode extends BaseNode {
    public issue: Issue;

    constructor(_issue: Issue) {
        super();
        this.issue = _issue;
    }

    getTreeItem(): vscode.TreeItem {
        let treeItem = new vscode.TreeItem(`${this.issue.summary}`, (this.issue.subtasks.length > 0 || this.issue.epicChildren.length > 0) ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
        treeItem.command = { command: Commands.ShowIssue, title: "Show Issue", arguments: [this.issue], };
        treeItem.iconPath = vscode.Uri.parse(this.issue.issueType.iconUrl);
        treeItem.contextValue = IssueNodeContextValue;
        treeItem.tooltip = `${this.issue.key} - ${this.issue.summary}`;
        return treeItem;
    }

    async getChildren(element?: IssueNode): Promise<IssueNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (this.issue.subtasks.length > 0) {
            return this.issue.subtasks.map(subtask => new IssueNode(subtask));
        }

        if (this.issue.epicChildren.length > 0) {
            return this.issue.epicChildren.map(epicChild => new IssueNode(epicChild));
        }
        return [];
    }
}