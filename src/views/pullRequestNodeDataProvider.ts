import { commands, Disposable, Event, EventEmitter, TreeItem, Uri, window, workspace } from 'vscode';
import { prPaginationEvent, viewScreenEvent } from '../analytics';
import { ProductBitbucket } from '../atlclients/authInfo';
import { BitbucketContext } from '../bitbucket/bbContext';
import { clientForSite } from '../bitbucket/bbUtils';
import { PaginatedPullRequests, WorkspaceRepo } from '../bitbucket/model';
import { Commands } from '../commands';
import { Container } from '../container';
import { BaseTreeDataProvider } from './Explorer';
import { GitContentProvider } from './gitContentProvider';
import { AbstractBaseNode } from './nodes/abstractBaseNode';
import { emptyBitbucketNodes } from './nodes/bitbucketEmptyNodeList';
import { SimpleNode } from './nodes/simpleNode';
import { CreatePullRequestNode, PullRequestHeaderNode } from './pullrequest/headerNode';
import { RepositoriesNode } from './pullrequest/repositoriesNode';

const createPRNode = new CreatePullRequestNode();
const headerNode = new PullRequestHeaderNode('Showing open pull requests');

export class PullRequestNodeDataProvider extends BaseTreeDataProvider {
    private _onDidChangeTreeData: EventEmitter<AbstractBaseNode | undefined> = new EventEmitter<
        AbstractBaseNode | undefined
    >();
    readonly onDidChangeTreeData: Event<AbstractBaseNode | undefined> = this._onDidChangeTreeData.event;
    private _childrenMap: Map<string, RepositoriesNode> | undefined = undefined;
    private _fetcher: (wsRepo: WorkspaceRepo) => Promise<PaginatedPullRequests> = async (wsRepo: WorkspaceRepo) => {
        const bbApi = await clientForSite(wsRepo.mainSiteRemote.site!);
        return await bbApi.pullrequests.getList(wsRepo);
    };

    public static SCHEME = 'atlascode.bbpr';
    private _disposable: Disposable;

    constructor(private ctx: BitbucketContext) {
        super();
        this._disposable = Disposable.from(
            workspace.registerTextDocumentContentProvider(
                PullRequestNodeDataProvider.SCHEME,
                new GitContentProvider(ctx)
            ),
            commands.registerCommand(Commands.BitbucketPullRequestsNextPage, async (prs: PaginatedPullRequests) => {
                const bbApi = await clientForSite(prs.site);
                const result = await bbApi.pullrequests.nextPage(prs);
                this.addItems(result);
                prPaginationEvent().then(e => Container.analyticsClient.sendUIEvent(e));
            }),
            commands.registerCommand(Commands.BitbucketShowOpenPullRequests, () => {
                this._fetcher = async (wsRepo: WorkspaceRepo) => {
                    const bbApi = await clientForSite(wsRepo.mainSiteRemote.site!);
                    return await bbApi.pullrequests.getList(wsRepo);
                };
                headerNode.description = 'Showing open pull requests';
                this.refresh();
            }),
            commands.registerCommand(Commands.BitbucketShowPullRequestsCreatedByMe, () => {
                this._fetcher = async (wsRepo: WorkspaceRepo) => {
                    const bbApi = await clientForSite(wsRepo.mainSiteRemote.site!);
                    return await bbApi.pullrequests.getListCreatedByMe(wsRepo);
                };
                headerNode.description = 'Showing pull requests created by me';
                this.refresh();
            }),
            commands.registerCommand(Commands.BitbucketShowPullRequestsToReview, () => {
                this._fetcher = async (wsRepo: WorkspaceRepo) => {
                    const bbApi = await clientForSite(wsRepo.mainSiteRemote.site!);
                    return await bbApi.pullrequests.getListToReview(wsRepo);
                };
                headerNode.description = 'Showing pull requests to review';
                this.refresh();
            }),
            commands.registerCommand(Commands.BitbucketPullRequestFilters, () => {
                window
                    .showQuickPick([
                        'Show all open pull requests',
                        'Show pull requests created by me',
                        'Show pull requests to be reviewed'
                    ])
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
            commands.registerCommand(Commands.RefreshPullRequestExplorerNode, (uri: Uri) => this.refreshResource(uri)),
            ctx.onDidChangeBitbucketContext(() => this.refresh())
        );
    }

    private async updateChildren() {
        if (!this._childrenMap) {
            this._childrenMap = new Map();
        }
        const workspaceRepos = this.ctx.getBitbucketRepositories();
        const expand = workspaceRepos.length === 1;

        // dispose any removed repos
        this._childrenMap.forEach((val, key) => {
            if (!workspaceRepos.find(repo => repo.rootUri === key)) {
                val.dispose();
                this._childrenMap!.delete(key);
            } else {
                val.fetcher = this._fetcher;
            }
        });

        // add nodes for newly added repos
        for (const wsRepo of workspaceRepos) {
            const repoUri = wsRepo.rootUri;
            this._childrenMap!.has(repoUri)
                ? this._childrenMap!.get(repoUri)!.markDirty()
                : this._childrenMap!.set(repoUri, new RepositoriesNode(this._fetcher, wsRepo, expand));
        }
    }

    async refresh() {
        await this.updateChildren();
        this._onDidChangeTreeData.fire();
    }

    async refreshResource(uri: Uri) {
        if (!this._childrenMap) {
            return;
        }
        this._childrenMap.forEach(child => {
            const foundItem = child.findResource(uri);
            if (foundItem) {
                this._onDidChangeTreeData.fire(foundItem);
            }
        });
    }

    async expandFirstPullRequestNode(forceFocus: boolean): Promise<boolean> {
        const children = await this.getChildren(undefined);

        //The 3rd child is the first repo node...
        if (!(children[0] instanceof SimpleNode) && children.length >= 3) {
            const prTitlesNodes = await children[2].getChildren();
            if (prTitlesNodes) {
                //If there's something to expand, first expand the PR node
                const repoDetailsPromise = prTitlesNodes[0].getChildren();
                this.reveal(prTitlesNodes[0], { expand: true, focus: true }).then(() => {
                    //When the PR node is fully loaded, focus the Details node
                    this.focusDetailsNode(repoDetailsPromise);
                });
                return true;
            } else if (forceFocus) {
                this.reveal(children[0], { focus: true });
                return true;
            } else {
                return false;
            }
        } else if (forceFocus) {
            this.reveal(children[0], { focus: true });
            return true;
        } else {
            return false;
        }
    }

    async focusDetailsNode(repoDetailsPromise: Promise<AbstractBaseNode[]>) {
        const result = await repoDetailsPromise;
        this.reveal(result[0], { focus: true });
    }

    addItems(prs: PaginatedPullRequests): void {
        if (!prs.workspaceRepo || !this._childrenMap || !this._childrenMap.get(prs.workspaceRepo.rootUri)) {
            return;
        }

        this._childrenMap.get(prs.workspaceRepo.rootUri)!.addItems(prs);
        this._onDidChangeTreeData.fire();
    }

    async getTreeItem(element: AbstractBaseNode): Promise<TreeItem> {
        return element.getTreeItem();
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (Container.siteManager.getSitesAvailable(ProductBitbucket).length === 0) {
            viewScreenEvent('pullRequestsTreeViewUnauthenticatedMessage', undefined, ProductBitbucket).then(event =>
                Container.analyticsClient.sendScreenEvent(event)
            );
            return [
                new SimpleNode('Authenticate with Bitbucket to view pull requests', {
                    command: Commands.ShowBitbucketAuth,
                    title: 'Open Bitbucket Settings'
                })
            ];
        }

        const repos = this.ctx.getBitbucketRepositories();
        if (repos.length < 1) {
            viewScreenEvent('pullRequestsTreeViewNoReposFoundMessage', undefined, ProductBitbucket).then(event =>
                Container.analyticsClient.sendScreenEvent(event)
            );
            return emptyBitbucketNodes;
        }

        if (element) {
            return element.getChildren();
        }
        if (!this._childrenMap) {
            this.updateChildren();
        }

        return [createPRNode, headerNode, ...Array.from(this._childrenMap!.values())];
    }

    dispose() {
        if (this._childrenMap) {
            this._childrenMap.forEach(node => node.dispose());
        }
        this._disposable.dispose();
        this._onDidChangeTreeData.dispose();
    }
}
