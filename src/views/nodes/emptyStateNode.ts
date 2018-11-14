import * as vscode from 'vscode';
import { IssueNode } from './issueNode';
import { emptyIssue } from '../../jira/jiraIssue';

export class EmptyStateNode extends IssueNode {
    constructor(private text: string) {
        super(emptyIssue);
    }

    getTreeItem(): vscode.TreeItem {
        return new vscode.TreeItem(this.text, vscode.TreeItemCollapsibleState.None);
    }

    async getChildren(element?: IssueNode): Promise<IssueNode[]> {
        return [];
    }
}