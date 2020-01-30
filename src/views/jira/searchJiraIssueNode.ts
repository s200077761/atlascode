import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Commands } from '../../commands';
import { Resources } from '../../resources';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from '../../atlclients/authInfo';

export class SearchJiraIssuesNode extends AbstractBaseNode {
    private _searchableIssueList: MinimalORIssueLink<DetailedSiteInfo>[];
    private _keyAndSummaryToIssueMap: Map<string, MinimalORIssueLink<DetailedSiteInfo>> = new Map<string, MinimalORIssueLink<DetailedSiteInfo>>();

    /* 
        Issue keys are combined with issue summaries to make a key; this is because this combo is guaranteed to be unique, and avoids the needs for two maps.
        It is possible to create QuickPickItems and set the description to be the summary, but this requires making a custom QuickPick, which is not a trivial
        process. Also, It is not clear that have the summary be grayed out (as it would be in a description) would be appropriate.
    */
   
    setIssues(searchableIssueList: MinimalORIssueLink<DetailedSiteInfo>[]){
        this._searchableIssueList = searchableIssueList;
        this._searchableIssueList.forEach(issue => this._keyAndSummaryToIssueMap.set(`${issue.key}: ${issue.summary}`, issue));
    }

    getKeysAndSummary() {
        return this._searchableIssueList.map(issue => `${issue.key}: ${issue.summary}`);
    }

    getIssueForKeyAndSummary(keyAndSummary: string){
        return this._keyAndSummaryToIssueMap.get(keyAndSummary);
    }

    getTreeItem(): TreeItem {
        let treeItem = new TreeItem('Search issue results', TreeItemCollapsibleState.None);
        treeItem.iconPath = Resources.icons.get('search');

        treeItem.command = {
            command: Commands.JiraSearchIssues,
            title: 'Create Jira issue'
        };

        return treeItem;
    }
}