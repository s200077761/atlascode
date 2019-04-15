import { workspace, TreeDataProvider, Disposable, EventEmitter, Event, TreeItem, commands } from 'vscode';
import { BaseNode } from './nodes/baseNode';
import { BitbucketContext } from '../bitbucket/bbContext';
import { GitContentProvider } from './gitContentProvider';
import { PaginatedPullRequests } from '../bitbucket/model';
import { RepositoriesNode } from './pullrequest/repositoriesNode';
import { Commands } from '../commands';
import { Container } from '../container';
import { AuthProvider } from '../atlclients/authInfo';
import { EmptyStateNode } from './nodes/emptyStateNode';
import { PullRequestApi } from '../bitbucket/pullRequests';
import { RepositoriesApi } from '../bitbucket/repositories';
import { Repository } from '../typings/git';
import { prPaginationEvent } from '../analytics';

export class PullRequestNodeDataProvider implements TreeDataProvider<BaseNode>, Disposable {
    private _onDidChangeTreeData: EventEmitter<BaseNode | undefined> = new EventEmitter<BaseNode | undefined>();
    readonly onDidChangeTreeData: Event<BaseNode | undefined> = this._onDidChangeTreeData.event;
    private _childrenMap: Map<string, RepositoriesNode> | undefined = undefined;

    static SCHEME = 'atlascode.bbpr';
    private _disposable: Disposable;

    constructor(private ctx: BitbucketContext) {
        this._disposable = Disposable.from(
            workspace.registerTextDocumentContentProvider(PullRequestNodeDataProvider.SCHEME, new GitContentProvider(ctx)),
            commands.registerCommand(Commands.BitbucketPullRequestsNextPage, async (prs: PaginatedPullRequests) => {
                const result = await PullRequestApi.nextPage(prs);
                this.addItems(result);
                prPaginationEvent().then(e => Container.analyticsClient.sendUIEvent(e));
            }),
            ctx.onDidChangeBitbucketContext(() => this.refresh()),
        );
    }

    private updateChildren(): void {
        if (!this._childrenMap) {
            this._childrenMap = new Map();
        }
        const repos = this.ctx.getBitbucketRepositores();
        const expand = repos.length === 1;

        // dispose any removed repos
        this._childrenMap.forEach((val, key) => {
            if (!repos.find(repo => repo.rootUri.toString() === key)) {
                val.dispose();
                this._childrenMap!.delete(key);
            }
        });

        // add nodes for newly added repos
        repos.forEach(repo => {
            const repoUri = repo.rootUri.toString();
            this._childrenMap!.has(repoUri)
                ? this._childrenMap!.get(repoUri)!.refresh()
                : this._childrenMap!.set(repoUri, new RepositoriesNode(repo, expand));
        });
    }

    refresh(): void {
        this.updateChildren();
        this._onDidChangeTreeData.fire();
    }

    addItems(prs: PaginatedPullRequests): void {
        if (!this._childrenMap || !this._childrenMap.get(prs.repository.rootUri.toString())) {
            return;
        }

        this._childrenMap.get(prs.repository.rootUri.toString())!.addItems(prs);
        this._onDidChangeTreeData.fire();
    }

    async getTreeItem(element: BaseNode): Promise<TreeItem> {
        return element.getTreeItem();
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (!await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud)) {
            return [new EmptyStateNode("Please login to Bitbucket", { command: Commands.AuthenticateBitbucket, title: "Login to Bitbucket" })];
        }
        if (element) {
            return element.getChildren();
        }
        if (!this._childrenMap) {
            this.updateChildren();
        }
        if (this.repoHasStagingRemotes()
            && !await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloudStaging)) {
            return [new EmptyStateNode("Please login to Bitbucket Staging", { command: Commands.AuthenticateBitbucketStaging, title: "Login to Bitbucket Staging" })];
        }
        if (this.ctx.getBitbucketRepositores().length === 0) {
            return [new EmptyStateNode("No Bitbucket repositories found")];
        }
        return Array.from(this._childrenMap!.values());
    }

    dispose() {
        if (this._childrenMap) {
            this._childrenMap.forEach(node => node.dispose());
        }
        this._disposable.dispose();
        this._onDidChangeTreeData.dispose();
    }

    private repoHasStagingRemotes(): boolean {
        return !!this.ctx.getBitbucketRepositores()
            .find(repo => this.isStagingRepo(repo));
    }

    private isStagingRepo(repo: Repository): boolean {
        return !!PullRequestApi.getBitbucketRemotes(repo)
            .find(remote => RepositoriesApi.isStagingUrl(RepositoriesApi.urlForRemote(remote)));
    }
}
