import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { BaseNode } from '../nodes/baseNode';
import { Commands } from '../../commands';
import { Resources } from '../../resources';

export class PullRequestHeaderNode extends BaseNode {

    constructor(public description: string) {
        super();
    }

    getTreeItem(): TreeItem {
        let treeItem = new TreeItem('', TreeItemCollapsibleState.None);
        treeItem.label = this.description;
        treeItem.description = 'click to change filter';
        treeItem.iconPath = Resources.icons.get('pullrequests');

        treeItem.command = {
            command: Commands.BitbucketPullRequestFilters,
            title: 'Show Bitbucket explorer filters'
        };

        return treeItem;

    }

    async getChildren(): Promise<BaseNode[]> {
        return [];
    }
}