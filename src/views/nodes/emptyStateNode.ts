import { TreeItem, TreeItemCollapsibleState, Command } from 'vscode';
import { IssueNode } from './issueNode';
import { emptyIssue } from '../../jira/jiraIssue';

export class EmptyStateNode extends IssueNode {

    private command:Command|undefined;

    constructor(private text: string, command?:Command) {
        super(emptyIssue);
        this.command = command;
    }

    getTreeItem(): TreeItem {
        let treeItem = new TreeItem(this.text, TreeItemCollapsibleState.None);

        if(this.command) {
            treeItem.command = this.command;
        }

        return treeItem;
        
    }

    async getChildren(element?: IssueNode): Promise<IssueNode[]> {
        return [];
    }
}