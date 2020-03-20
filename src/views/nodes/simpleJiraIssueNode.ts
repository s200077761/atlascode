import { createEmptyMinimalIssue } from '@atlassianlabs/jira-pi-common-models/emptyEntities';
import { Command, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { emptySiteInfo } from '../../atlclients/authInfo';
import { IssueNode } from './issueNode';

export class SimpleJiraIssueNode extends IssueNode {
    private command: Command | undefined;

    constructor(private text: string, command?: Command) {
        super(createEmptyMinimalIssue(emptySiteInfo), undefined);
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
