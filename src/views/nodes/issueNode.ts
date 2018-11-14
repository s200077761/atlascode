import * as vscode from "vscode";

import { BaseNode } from "./baseNode";
import { Issue } from "../../jira/jiraIssue";
import { Commands } from "../../commands";

export class IssueNode extends BaseNode {
    public issue:Issue;

    constructor(_issue:Issue) {
        super();
        this.issue = _issue;
    }

    getTreeItem(): vscode.TreeItem {
        let treeItem = new vscode.TreeItem(`${this.issue.summary}`, vscode.TreeItemCollapsibleState.None);
        treeItem.command = { command: Commands.ShowIssue, title: "Show Issue", arguments: [this.issue], };
        treeItem.iconPath = vscode.Uri.parse(this.issue.issueType.iconUrl);
        treeItem.contextValue = this.issue.key;
        treeItem.tooltip = `${this.issue.key} - ${this.issue.summary}`;
        return treeItem;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        return [];
    }
}