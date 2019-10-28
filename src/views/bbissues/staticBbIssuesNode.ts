import * as vscode from 'vscode';
import { clientForSite, workspaceRepoFor } from '../../bitbucket/bbUtils';
import { Commands } from '../../commands';
import { Resources } from '../../resources';
import { Repository } from '../../typings/git';
import { AbstractBaseNode } from "../nodes/abstractBaseNode";
import { SimpleNode } from '../nodes/simpleNode';

export class StaticBitbucketIssuesNode extends AbstractBaseNode {
    private _children: AbstractBaseNode[] | undefined = undefined;

    constructor(private repository: Repository, private issueKeys: string[]) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem('Related Bitbucket issues', vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = Resources.icons.get('issues');
        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this._children) {
            const wsRepo = workspaceRepoFor(this.repository);
            const site = wsRepo.mainSiteRemote.site;
            if (!site) {
                return [];
            }

            const bbApi = await clientForSite(site);
            let issues = await bbApi.issues!.getIssuesForKeys(site, this.issueKeys);
            if (issues.length === 0) {
                return [new SimpleNode('No issues found')];
            }
            this._children = issues.map(i => new SimpleNode(`#${i.data.id} ${i.data.title!}`, { command: Commands.ShowBitbucketIssue, title: 'Open bitbucket issue', arguments: [i] }));
        }
        return this._children;
    }
}
