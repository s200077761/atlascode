import * as vscode from "vscode";

import { BaseNode } from "./baseNode";
import { Issue } from "../../jira/jiraIssue";
import { Commands } from "../../commands";

export class IssueNode extends BaseNode {
    constructor(private _issue: Issue) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let treeItem = new vscode.TreeItem(`${this._issue.summary}`, vscode.TreeItemCollapsibleState.None);
        treeItem.command = { command: Commands.ShowIssue, title: "Show Issue", arguments: [this._issue], };
        treeItem.iconPath = vscode.Uri.parse(this._issue.issueType.iconUrl);
        treeItem.contextValue = this._issue.key;
        treeItem.tooltip = `${this._issue.key} - ${this._issue.summary}`;
        return treeItem;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        return [];
    }
}