import * as vscode from 'vscode';
import { getPullRequest, getPullRequestChangedFiles } from '../../bitbucket/pullRequests';
import { BaseNode } from './baseNode';
import { PullRequestDecorated } from '../../bitbucket/model';

export class PullRequestTitlesNode extends BaseNode {
    constructor(private pr: PullRequestDecorated) {
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
            this.pr = await getPullRequest(this.pr);
            let fileChanges: any[] = await getPullRequestChangedFiles(this.pr);
            return fileChanges.map(fileChange => new PullRequestFilesNode(fileChange));
        } else {
            return element.getChildren();
        }
    }
}

class PullRequestFilesNode extends BaseNode {
    constructor(private fileChange: any) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem(this.fileChange.filename, vscode.TreeItemCollapsibleState.None);
        item.iconPath = false;

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        return [];
    }
}