import * as vscode from 'vscode';
import { BaseNode } from "../nodes/baseNode";
import { Resources } from '../../resources';
import { Repository } from '../../typings/git';
import { BitbucketIssuesApi } from '../../bitbucket/bbIssues';
import { Commands } from '../../commands';
import { EmptyNode } from '../nodes/emptyStateBaseNode';

export class StaticBitbucketIssuesNode extends BaseNode {
    private _children: BaseNode[] | undefined = undefined;

    constructor(private repository: Repository, private issueKeys: string[]) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem('Related Bitbucket Issues', vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = Resources.icons.get('issues');
        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this._children) {
            let issues = await BitbucketIssuesApi.getIssuesForKeys(this.repository, this.issueKeys);
            if (issues.length === 0) {
                return [new EmptyNode('No issues found')];
            }
            this._children = issues.map(i => new EmptyNode(`#${i.id} ${i.title!}`, { command: Commands.ShowBitbucketIssue, title: 'Open bitbucket issue', arguments: [i] }));
        }
        return this._children;
    }
}
