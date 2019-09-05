import { workspace, Disposable, EventEmitter, Event, TreeItem, commands, window } from 'vscode';
import { AbstractBaseNode } from './nodes/abstractBaseNode';
import { BitbucketContext } from '../bitbucket/bbContext';
import { GitContentProvider } from './gitContentProvider';
import { PaginatedPullRequests } from '../bitbucket/model';
import { RepositoriesNode } from './pullrequest/repositoriesNode';
import { Commands } from '../commands';
import { Container } from '../container';
import { Repository, Remote } from '../typings/git';
import { prPaginationEvent } from '../analytics';
import { PullRequestHeaderNode } from './pullrequest/headerNode';
import { BaseTreeDataProvider } from './Explorer';
import { emptyBitbucketNodes } from './nodes/bitbucketEmptyNodeList';
import { clientForRemote, firstBitbucketRemote } from '../bitbucket/bbUtils';

const headerNode = new PullRequestHeaderNode('showing open pull requests');

export class PullRequestNodeDataProvider extends BaseTreeDataProvider {
    private _onDidChangeTreeData: EventEmitter<AbstractBaseNode | undefined> = new EventEmitter<AbstractBaseNode | undefined>();
    readonly onDidChangeTreeData: Event<AbstractBaseNode | undefined> = this._onDidChangeTreeData.event;
    private _childrenMap: Map<string, RepositoriesNode> | undefined = undefined;
    private _fetcher: (repo: Repository, remote: Remote) => Promise<PaginatedPullRequests> = async (repo: Repository, remote: Remote) => {
        const bbApi = await clientForRemote(remote);
        return await bbApi.pullrequests.getList(repo, remote);
    }

    public static SCHEME = 'atlascode.bbpr';
    private _disposable: Disposable;

    constructor(private ctx: BitbucketContext) {
        super();
        this._disposable = Disposable.from(
            workspace.registerTextDocumentContentProvider(PullRequestNodeDataProvider.SCHEME, new GitContentProvider(ctx)),
            commands.registerCommand(Commands.BitbucketPullRequestsNextPage, async (prs: PaginatedPullRequests) => {
                const bbApi = await clientForRemote(prs.remote);
                const result = await bbApi.pullrequests.nextPage(prs);
                this.addItems(result);
                prPaginationEvent().then(e => Container.analyticsClient.sendUIEvent(e));
            }),
            commands.registerCommand(Commands.BitbucketShowOpenPullRequests, () => {
                this._fetcher = async (repo: Repository, remote: Remote) => {
                    const bbApi = await clientForRemote(remote);
                    return await bbApi.pullrequests.getList(repo, remote);
                };
                headerNode.description = 'showing open pull requests';
                this.refresh();
            }),
            commands.registerCommand(Commands.BitbucketShowPullRequestsCreatedByMe, () => {
                this._fetcher = async (repo: Repository, remote: Remote) => {
                    const bbApi = await clientForRemote(remote);
                    return await bbApi.pullrequests.getListCreatedByMe(repo, remote);
                };
                headerNode.description = 'showing pull requests created by me';
                this.refresh();
            }),
            commands.registerCommand(Commands.BitbucketShowPullRequestsToReview, () => {
                this._fetcher = async (repo: Repository, remote: Remote) => {
                    const bbApi = await clientForRemote(remote);
                    return await bbApi.pullrequests.getListToReview(repo, remote);
                };
                headerNode.description = 'showing pull requests to review';
                this.refresh();
            }),
            commands.registerCommand(Commands.BitbucketPullRequestFilters, () => {
                window
                    .showQuickPick(['Show all open pull requests', 'Show pull requests created by me', 'Show pull requests to be reviewed'])
                    .then((selected: string) => {
                        switch (selected) {
                            case 'Show all open pull requests':
                                commands.executeCommand(Commands.BitbucketShowOpenPullRequests);
                                break;
                            case 'Show pull requests created by me':
                                commands.executeCommand(Commands.BitbucketShowPullRequestsCreatedByMe);
                                break;
                            case 'Show pull requests to be reviewed':
                                commands.executeCommand(Commands.BitbucketShowPullRequestsToReview);
                                break;
                            default:
                                break;
                        }
                    });
            }),
            ctx.onDidChangeBitbucketContext(() => this.refresh()),
        );
    }

    private async updateChildren() {
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
            } else {
                val.fetcher = this._fetcher;
            }
        });

        // add nodes for newly added repos
        for (const repo of repos) {
            const repoUri = repo.rootUri.toString();
            const remote = firstBitbucketRemote(repo);
            this._childrenMap!.has(repoUri)
                ? await this._childrenMap!.get(repoUri)!.refresh()
                : this._childrenMap!.set(repoUri, new RepositoriesNode(this._fetcher, repo, remote, expand));
        }
    }

    async refresh() {
        await this.updateChildren();
        this._onDidChangeTreeData.fire();
    }

    addItems(prs: PaginatedPullRequests): void {
        if (!this._childrenMap || !this._childrenMap.get(prs.repository.rootUri.toString())) {
            return;
        }

        this._childrenMap.get(prs.repository.rootUri.toString())!.addItems(prs);
        this._onDidChangeTreeData.fire();
    }

    async getTreeItem(element: AbstractBaseNode): Promise<TreeItem> {
        return element.getTreeItem();
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        const repos = this.ctx.getBitbucketRepositores();
        if (repos.length < 1) {
            return emptyBitbucketNodes;
        }

        if (element) {
            return element.getChildren();
        }
        if (!this._childrenMap) {
            this.updateChildren();
        }

        return [headerNode, ...Array.from(this._childrenMap!.values())];
    }

    dispose() {
        if (this._childrenMap) {
            this._childrenMap.forEach(node => node.dispose());
        }
        this._disposable.dispose();
        this._onDidChangeTreeData.dispose();
    }
}
