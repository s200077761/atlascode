import { TreeItem, TreeItemCollapsibleState, Command } from 'vscode';
import { IssueNode } from './issueNode';
import { emptyMinimalIssue } from '../../jira/jira-client/model/emptyEntities';

export class SimpleJiraIssueNode extends IssueNode {

    private command: Command | undefined;

    constructor(private text: string, command?: Command) {
        super(emptyMinimalIssue);
        this.command = command;
    }

    getTreeItem(): TreeItem {
        let treeItem = new TreeItem(this.text, TreeItemCollapsibleState.None);
        treeItem.tooltip = this.text;

        if (this.command) {
            treeItem.command = this.command;
        }

        return treeItem;

    }

    async getChildren(element?: IssueNode): Promise<IssueNode[]> {
        return [];
    }
}