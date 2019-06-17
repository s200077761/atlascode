import * as path from 'path';
import * as vscode from 'vscode';
import { AbstractBaseNode } from "../nodes/abstractBaseNode";
import { Repository } from '../../typings/git';
import { PullRequestTitlesNode, NextPageNode, PullRequestContextValue } from './pullRequestNode';
import { PaginatedPullRequests, PullRequest } from '../../bitbucket/model';
import { SimpleNode } from '../nodes/simpleNode';
import { Container } from '../../container';
import { getBitbucketRemotes, parseGitUrl, urlForRemote, siteDetailsForRemote } from '../../bitbucket/bbUtils';

export class RepositoriesNode extends AbstractBaseNode {
    private _children: (PullRequestTitlesNode | NextPageNode)[] | undefined = undefined;

    constructor(public fetcher: (repo: Repository) => Promise<PaginatedPullRequests>, private repository: Repository, private expand?: boolean) {
        super();
        this.disposables.push(({
            dispose: () => {
                if (this._children) {
                    this._children.forEach(child => {
                        if (child instanceof PullRequestTitlesNode) {
                            Container.bitbucketContext.prCommentController.disposePR(child.prHref);
                        }
                        child.dispose();
                    });
                }
            }
        }));
    }

    async refresh() {
        const previousChildrenHrefs = (this._children || [])
            .filter(child => child instanceof PullRequestTitlesNode)
            .map(child => (child as PullRequestTitlesNode).prHref);

        let prs = await this.fetcher(this.repository);
        this._children = prs.data.map(pr => this.createChildNode(pr));
        if (prs.next) { this._children!.push(new NextPageNode(prs)); }

        // dispose comments for any PRs that might have been closed during refresh
        previousChildrenHrefs.forEach(prHref => {
            if (!this._children!.find(child => child instanceof PullRequestTitlesNode && child.prHref === prHref)) {
                Container.bitbucketContext.prCommentController.disposePR(prHref);
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
        return new PullRequestTitlesNode(pr, Container.bitbucketContext.prCommentController);
    }

    getTreeItem(): vscode.TreeItem {
        const directory = path.basename(this.repository.rootUri.fsPath);
        const item = new vscode.TreeItem(`${directory}`, this.expand ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = this.repository.rootUri.fsPath;
        item.contextValue = PullRequestContextValue;
        const remotes = getBitbucketRemotes(this.repository);
        if (remotes.length > 0) {
            const repoName = parseGitUrl(urlForRemote(remotes[0])).full_name;
            const site = siteDetailsForRemote(remotes[0]);

            if (site) {
                item.resourceUri = vscode.Uri.parse(`${site.baseLinkUrl}/${repoName}/pull-requests`);
            }
        }

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this._children) {
            await this.refresh();
        }
        if (this._children!.length === 0) {
            return [new SimpleNode('No pull requests found for this repository')];
        }
        return this._children!;
    }
}