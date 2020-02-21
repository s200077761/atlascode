import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Commands } from '../../commands';
import { Resources } from '../../resources';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';

export class PullRequestHeaderNode extends AbstractBaseNode {
    constructor(public description: string) {
        super();
    }

    getTreeItem(): TreeItem {
        let treeItem = new TreeItem('', TreeItemCollapsibleState.None);
        treeItem.label = this.description;
        treeItem.description = 'click to change filter';
        treeItem.iconPath = Resources.icons.get('preferences');

        treeItem.command = {
            command: Commands.BitbucketPullRequestFilters,
            title: 'Show Bitbucket explorer filters'
        };

        return treeItem;
    }
}

export class CreatePullRequestNode extends AbstractBaseNode {
    getTreeItem(): TreeItem {
        let treeItem = new TreeItem('Create pull request...', TreeItemCollapsibleState.None);
        treeItem.iconPath = Resources.icons.get('pullrequests');

        treeItem.command = {
            command: Commands.CreatePullRequest,
            title: 'Create pull request'
        };

        return treeItem;
    }
}
