import * as path from 'path';
import * as vscode from 'vscode';
import { PaginatedPullRequests, PullRequest, WorkspaceRepo } from '../../bitbucket/model';
import { Container } from '../../container';
import { AbstractBaseNode } from "../nodes/abstractBaseNode";
import { SimpleNode } from '../nodes/simpleNode';
import { NextPageNode, PullRequestContextValue, PullRequestTitlesNode } from './pullRequestNode';

export class RepositoriesNode extends AbstractBaseNode {
    private _children: (PullRequestTitlesNode | NextPageNode)[] | undefined = undefined;

    constructor(
        public fetcher: (wsRepo: WorkspaceRepo) => Promise<PaginatedPullRequests>,
        private workspaceRepo: WorkspaceRepo,
        private expand?: boolean
    ) {
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

        let prs = await this.fetcher(this.workspaceRepo);
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
        const directory = path.basename(this.workspaceRepo.rootUri);
        const item = new vscode.TreeItem(`${directory}`, this.expand ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = this.workspaceRepo.rootUri;
        item.contextValue = PullRequestContextValue;

        const site = this.workspaceRepo.mainSiteRemote.site!;
        item.resourceUri = vscode.Uri.parse(site.details.isCloud
            ? `${site.details.baseLinkUrl}/${site.ownerSlug}/${site.repoSlug}/pull-requests`
            : `${site.details.baseLinkUrl}/projects/${site.ownerSlug}/repos/${site.repoSlug}/pull-requests`);

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