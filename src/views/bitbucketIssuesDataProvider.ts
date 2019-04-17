import { Disposable, EventEmitter, Event, TreeItem, commands } from 'vscode';
import { BaseNode } from './nodes/baseNode';
import { BitbucketContext } from '../bitbucket/bbContext';
import { PaginatedBitbucketIssues } from '../bitbucket/model';
import { Commands } from '../commands';
import { Container } from '../container';
import { AuthProvider } from '../atlclients/authInfo';
import { EmptyStateNode } from './nodes/emptyStateNode';
import { PullRequestApi } from '../bitbucket/pullRequests';
import { RepositoriesApi } from '../bitbucket/repositories';
import { Repository } from '../typings/git';
import { BitbucketIssuesRepositoryNode } from './bbissues/bbIssueNode';
import { BitbucketIssuesApi } from '../bitbucket/bbIssues';
import { bbIssuesPaginationEvent } from '../analytics';
import { Tree } from './BitbucketExplorer';

export class BitbucketIssuesDataProvider implements Tree {
    private _onDidChangeTreeData: EventEmitter<BaseNode | undefined> = new EventEmitter<BaseNode | undefined>();
    readonly onDidChangeTreeData: Event<BaseNode | undefined> = this._onDidChangeTreeData.event;
    private _childrenMap: Map<string, BitbucketIssuesRepositoryNode> | undefined = undefined;

    private _disposable: Disposable;

    constructor(private ctx: BitbucketContext) {
        this._disposable = Disposable.from(
            commands.registerCommand(Commands.BitbucketIssuesNextPage, async (issues: PaginatedBitbucketIssues) => {
                const result = await BitbucketIssuesApi.nextPage(issues);
                this.addItems(result);
                bbIssuesPaginationEvent().then(e => Container.analyticsClient.sendUIEvent(e));
            }),
            ctx.onDidChangeBitbucketContext(() => {
                this.refresh();
            }),
        );
    }

    private updateChildren(): void {
        if (!this._childrenMap) {
            this._childrenMap = new Map();
        }
        this._childrenMap.clear();
        const repos = this.ctx.getBitbucketRepositores();
        const expand = repos.length === 1;
        repos.forEach(repo => {
            this._childrenMap!.set(repo.rootUri.toString(), new BitbucketIssuesRepositoryNode(repo, expand));
        });
    }

    refresh(): void {
        this.updateChildren();
        this._onDidChangeTreeData.fire();
    }

    addItems(issues: PaginatedBitbucketIssues): void {
        if (!this._childrenMap || !this._childrenMap.get(issues.repository.rootUri.toString())) {
            return;
        }

        this._childrenMap.get(issues.repository.rootUri.toString())!.addItems(issues);
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
