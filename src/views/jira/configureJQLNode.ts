import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Commands } from '../../commands';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';

export class ConfigureJQLNode extends AbstractBaseNode {

    getTreeItem(): TreeItem {
        let treeItem = new TreeItem('Configure filters...', TreeItemCollapsibleState.None);

        treeItem.command = {
            command: Commands.ShowJiraIssueSettings,
            title: 'Configure Filters'
        };

        return treeItem;
    }
}