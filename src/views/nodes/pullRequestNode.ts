import * as vscode from 'vscode';
import { PullRequestApi } from '../../bitbucket/pullRequests';
import { BaseNode } from './baseNode';
import { PullRequest, PaginatedPullRequests } from '../../bitbucket/model';
import { Resources } from '../../resources';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { Commands } from '../../commands';

export class PullRequestTitlesNode extends BaseNode {
    constructor(private pr: PullRequest) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem(`#${this.pr.data.id!} ${this.pr.data.title!}`, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = `#${this.pr.data.id!} ${this.pr.data.title!}`;
        item.iconPath = vscode.Uri.parse(this.pr.data!.author!.links!.avatar!.href!);
        item.contextValue = 'pullrequest';

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (!element) {
            if (!this.pr) { return []; }
            // When a repo's pullrequests are fetched, the response may not have all fields populated.
            // Fetch the specific pullrequest by id to fill in the missing details.
            this.pr = await PullRequestApi.get(this.pr);
            let fileChanges: any[] = await PullRequestApi.getChangedFiles(this.pr);
            return [
                new DescriptionNode(this.pr),
                ...fileChanges.map(fileChange => new PullRequestFilesNode(this.pr, fileChange))
            ];
        } else {
            return element.getChildren();
        }
    }
}

class PullRequestFilesNode extends BaseNode {
    constructor(private pr: PullRequest, private fileChange: any) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem(this.fileChange.filename, vscode.TreeItemCollapsibleState.None);

        let lhsQueryParam = { query: JSON.stringify({ remote: this.pr.remote.name, branch: this.pr.data.destination!.branch!.name!, path: this.fileChange.filename, commit: this.pr.data.destination!.commit!.hash! }) };
        let rhsQueryParam = { query: JSON.stringify({ remote: this.pr.remote.name, branch: this.pr.data.source!.branch!.name!, path: this.fileChange.filename, commit: this.pr.data.source!.commit!.hash! }) };
        switch (this.fileChange.status) {
            case 'added':
                item.iconPath = Resources.icons.get('add');
                lhsQueryParam = { query: JSON.stringify({}) };
                break;
            case 'removed':
                item.iconPath = Resources.icons.get('delete');
                rhsQueryParam = { query: JSON.stringify({}) };
            default:
                item.iconPath = Resources.icons.get('edit');
                break;
        }

        item.command = {
            command: 'vscode.diff',
            title: 'Diff file',
            arguments: [
                vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${this.fileChange.filename}`).with(lhsQueryParam),
                vscode.Uri.parse(`${PullRequestNodeDataProvider.SCHEME}://${this.fileChange.filename}`).with(rhsQueryParam),
                this.fileChange.filename
            ]
        };

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        return [];
    }
}

class DescriptionNode extends BaseNode {
    constructor(private pr: PullRequest) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem('Details', vscode.TreeItemCollapsibleState.None);
        item.iconPath = Resources.icons.get('detail');

        item.command = {
            command: Commands.BitbucketShowPullRequestDetails,
            title: 'Open pull request details',
            arguments: [this.pr]
        };

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        return [];
    }
}

export class NextPageNode extends BaseNode {
    constructor(private prs: PaginatedPullRequests) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem('Load next page', vscode.TreeItemCollapsibleState.None);
        item.iconPath = Resources.icons.get('more');

        item.command = {
            command: Commands.BitbucketPullRequestsNextPage,
            title: 'Load pull requests next page',
            arguments: [this.prs]
        };

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        return [];
    }
}