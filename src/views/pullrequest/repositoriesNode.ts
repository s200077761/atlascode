import * as vscode from 'vscode';
import { BaseNode } from "../nodes/baseNode";
import { PullRequestApi, GitUrlParse } from "../../bitbucket/pullRequests";
import { Repository } from '../../typings/git';
import { PullRequestTitlesNode, NextPageNode, PullRequestContextValue } from './pullRequestNode';
import { PaginatedPullRequests, PullRequest } from '../../bitbucket/model';
import { PullRequestCommentController } from './prCommentController';
import { EmptyNode } from '../nodes/emptyStateBaseNode';

export class RepositoriesNode extends BaseNode {
    private _children: (PullRequestTitlesNode | NextPageNode)[] | undefined = undefined;
    private _commentControllers: Map<string, PullRequestCommentController> = new Map();

    constructor(public fetcher: (repo: Repository) => Promise<PaginatedPullRequests>, private repository: Repository, private expand?: boolean) {
        super();
        this.disposables.push(({
            dispose: () => {
                this._commentControllers.forEach(val => val.dispose());
            }
        }));
    }

    async refresh() {
        let prs = await this.fetcher(this.repository);
        this._children = prs.data.map(pr => this.createChildNode(pr));
        if (prs.next) { this._children!.push(new NextPageNode(prs)); }

        // dispose any comment controllers for any PRs that might have been closed during refresh
        this._commentControllers.forEach((val, key) => {
            if (!this._children!.find(child => child instanceof PullRequestTitlesNode && child.prHref === key)) {
                val.dispose();
            }
        });
    }

    addItems(prs: PaginatedPullRequests): void {
        if (!this._children) {
            this._children = [];
        }
        if (this._children.length > 0 && this._children[this._children.length - 1] instanceof NextPageNode) {
            this._children.pop();
        }
        this._children!.push(...prs.data.map(pr => this.createChildNode(pr)));
        if (prs.next) { this._children!.push(new NextPageNode(prs)); }
    }

    private createChildNode(pr: PullRequest): PullRequestTitlesNode {
        const prHref = pr.data!.links!.self!.href!;
        if (!this._commentControllers.has(prHref)) {
            this._commentControllers.set(prHref, new PullRequestCommentController());
        }
        return new PullRequestTitlesNode(pr, this._commentControllers.get(prHref)!);
    }

    getTreeItem(): vscode.TreeItem {
        const directory = this.repository.rootUri.path.split('/').pop();
        const item = new vscode.TreeItem(`${directory}`, this.expand ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = this.repository.rootUri.path;
        item.contextValue = PullRequestContextValue;
        const remote = PullRequestApi.getBitbucketRemotes(this.repository)[0];
        const repoName = GitUrlParse(remote.fetchUrl! || remote.pushUrl!).full_name;
        const prUrl = `https://bitbucket.org/${repoName}/pull-requests`;
        item.resourceUri = vscode.Uri.parse(prUrl);

        return item;
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this._children) {
            await this.refresh();
        }
        if (this._children!.length === 0) {
            return [new EmptyNode('No pull requests found for this repository')];
        }
        return this._children!;
    }
}