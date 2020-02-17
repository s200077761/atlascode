import * as path from 'path';
import * as vscode from 'vscode';
import { PaginatedPullRequests, PullRequest, WorkspaceRepo } from '../../bitbucket/model';
import { Container } from '../../container';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { SimpleNode } from '../nodes/simpleNode';
import { NextPageNode, PullRequestContextValue, PullRequestTitlesNode } from './pullRequestNode';

export class RepositoriesNode extends AbstractBaseNode {
    private treeItem: vscode.TreeItem;
    private prMap: Map<string, { pr: PullRequest; node: PullRequestTitlesNode }> = new Map<
        string,
        { pr: PullRequest; node: PullRequestTitlesNode }
    >();
    private children: (PullRequestTitlesNode | NextPageNode)[] | undefined = undefined;
    private dirty = false;

    constructor(
        public fetcher: (wsRepo: WorkspaceRepo) => Promise<PaginatedPullRequests>,
        private workspaceRepo: WorkspaceRepo,
        private expand?: boolean
    ) {
        super();
        this.treeItem = this.createTreeItem();
        this.disposables.push({
            dispose: () => {
                if (this.children) {
                    this.children.forEach(child => {
                        if (child instanceof PullRequestTitlesNode) {
                            Container.bitbucketContext.prCommentController.disposePR(child.prHref);
                        }
                        child.dispose();
                    });
                }
            }
        });
    }

    private createTreeItem(): vscode.TreeItem {
        const directory = path.basename(this.workspaceRepo.rootUri);
        const item = new vscode.TreeItem(
            `${directory}`,
            this.expand ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed
        );
        item.tooltip = this.workspaceRepo.rootUri;
        item.contextValue = PullRequestContextValue;

        const site = this.workspaceRepo.mainSiteRemote.site!;
        item.resourceUri = vscode.Uri.parse(
            site.details.isCloud
                ? `${site.details.baseLinkUrl}/${site.ownerSlug}/${site.repoSlug}/pull-requests`
                : `${site.details.baseLinkUrl}/projects/${site.ownerSlug}/repos/${site.repoSlug}/pull-requests`
        );

        return item;
    }

    async markDirty() {
        this.dirty = true;
    }

    private async refresh() {
        const previousChildrenHrefs = (this.children || [])
            .filter(child => child instanceof PullRequestTitlesNode)
            .map(child => (child as PullRequestTitlesNode).prHref);

        let prs = await this.fetcher(this.workspaceRepo);
        this.children = prs.data.map(pr => this.createChildNode(pr));
        if (prs.next) {
            this.children!.push(new NextPageNode(prs));
        }

        // dispose comments for any PRs that might have been closed during refresh
        previousChildrenHrefs.forEach(prHref => {
            if (!this.children!.find(child => child instanceof PullRequestTitlesNode && child.prHref === prHref)) {
                Container.bitbucketContext.prCommentController.disposePR(prHref);
            }
        });

        this.dirty = false;
    }

    findResource(uri: vscode.Uri): AbstractBaseNode | undefined {
        if (this.getTreeItem().resourceUri && this.getTreeItem().resourceUri!.toString() === uri.toString()) {
            return this;
        }
        for (const child of this.children || []) {
            if (child.getTreeItem().resourceUri && child.getTreeItem().resourceUri!.toString() === uri.toString()) {
                return child;
            }
        }
        return undefined;
    }

    addItems(prs: PaginatedPullRequests): void {
        if (!this.children) {
            this.children = [];
        }
        if (this.children.length > 0 && this.children[this.children.length - 1] instanceof NextPageNode) {
            this.children.pop();
        }
        this.children!.push(...prs.data.map(pr => this.createChildNode(pr)));
        if (prs.next) {
            this.children!.push(new NextPageNode(prs));
        }
    }

    private createChildNode(pr: PullRequest): PullRequestTitlesNode {
        //Don't cache BBServer prs; we have no way of knowing they're up to date because the updated time property does
        //not include PR actions like comments, tasks, etc.
        if (!pr.site.details.isCloud) {
            return new PullRequestTitlesNode(pr, Container.bitbucketContext.prCommentController);
        }

        const prAndTreeNode = this.prMap.get(pr.data.id);
        if (prAndTreeNode && pr.data.updatedTs === prAndTreeNode.pr.data.updatedTs) {
            return prAndTreeNode.node;
        } else {
            const prTitlesNode = new PullRequestTitlesNode(pr, Container.bitbucketContext.prCommentController);
            this.prMap.set(pr.data.id, { pr: pr, node: prTitlesNode });
            return prTitlesNode;
        }
    }

    getTreeItem(): vscode.TreeItem {
        return this.treeItem;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this.children || this.dirty) {
            await this.refresh();
        }
        if (this.children!.length === 0) {
            return [new SimpleNode('No pull requests found for this repository')];
        }
        return this.children!;
    }
}
