import { Disposable, EventEmitter, Event, ConfigurationChangeEvent, TreeView, window, commands, Uri, TreeViewVisibilityChangeEvent } from 'vscode';
import { Repository, API as GitApi } from "../typings/git";
import { configuration, BitbucketExplorerLocation } from '../config/configuration';
import { BaseNode } from '../views/nodes/baseNode';
import { Commands } from '../commands';
import { Container } from '../container';
import { PaginatedPullRequests } from './model';
import { PullRequestApi } from './pullRequests';
import { PullRequestNodeDataProvider } from '../views/pullRequestNodeDataProvider';
import { currentUserBitbucket } from '../commands/bitbucket/currentUser';
import { setCommandContext, CommandContext, PullRequestTreeViewId } from '../constants';
import { createPullRequest } from '../commands/bitbucket/createPullRequest';
import { AuthProvider } from '../atlclients/authInfo';
import { viewScreenEvent } from '../analytics';

const explorerLocation = {
    sourceControl: 'SourceControl',
    atlascode: 'Atlascode'
};

// BitbucketContext stores the context (hosts, auth, current repo etc.)
// for all Bitbucket related actions.
export class BitbucketContext extends Disposable {
    private _onDidChangeBitbucketContext: EventEmitter<void> = new EventEmitter<void>();
    readonly onDidChangeBitbucketContext: Event<void> = this._onDidChangeBitbucketContext.event;

    private _gitApi: GitApi;
    private _repoMap: Map<string, Repository> = new Map();
    private _tree:TreeView<BaseNode> | undefined;
    private _dataProvider:PullRequestNodeDataProvider;
    private _disposable:Disposable;

    constructor(gitApi: GitApi) {
        super(() => this.dispose());
        this._gitApi = gitApi;
        this._dataProvider = new PullRequestNodeDataProvider(this);

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this),

            Container.authManager.onDidAuthChange((e) => {
                if (e.provider === AuthProvider.BitbucketCloud) {
                    this._onDidChangeBitbucketContext.fire();
                }
            }),

            commands.registerCommand(Commands.CurrentUserBitbucket, currentUserBitbucket),
            
            commands.registerCommand(Commands.BitbucketShowPullRequestDetails, async (pr) => {
                await Container.pullRequestViewManager.createOrShow(pr);
            }),
            commands.registerCommand(Commands.BitbucketPullRequestsNextPage, async (prs: PaginatedPullRequests) => {
                const result = await PullRequestApi.nextPage(prs);
                this.addTreeItems(result);
            },this),
            commands.registerCommand(Commands.CreatePullRequest, () => createPullRequest(this))
        );

        this._disposable = Disposable.from(
            this._gitApi.onDidOpenRepository(this.refreshRepos, this),
            this._gitApi.onDidCloseRepository(this.refreshRepos, this)
        );

        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    private refreshRepos() {
        this._repoMap.clear();
        this._gitApi.repositories.forEach(repo => this._repoMap.set(repo.rootUri.toString(), repo));
        this._onDidChangeBitbucketContext.fire();
    }

    addTreeItems(page:PaginatedPullRequests) {
        if(this._dataProvider) {
            this._dataProvider.addItems(page);
        }
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'bitbucket.explorer.enabled')) {
            if(!Container.config.bitbucket.explorer.enabled) {
                this.disposeForNow();
            } else {
                this._tree = window.createTreeView(PullRequestTreeViewId, {
                    treeDataProvider: this._dataProvider
                });

                this._tree.onDidChangeVisibility(e => this.onDidChangeVisibility(e));

                this.refreshRepos();
            }
            setCommandContext(CommandContext.BitbucketExplorer, Container.config.bitbucket.explorer.enabled);
        }

        if(initializing || configuration.changed(e, 'bitbucket.explorer.location')) {
            this.setLocationContext();
        }
    }

    onDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
        if (event.visible) {
            viewScreenEvent(PullRequestTreeViewId).then(e => { Container.analyticsClient.sendScreenEvent(e); });
        }
    }
    
    private setLocationContext() {
        let location = Container.config.bitbucket.explorer.location;
        if (location !== explorerLocation.sourceControl && location !== explorerLocation.atlascode) {
            location = BitbucketExplorerLocation.Atlascode;
        }
        setCommandContext(CommandContext.BitbucketExplorerLocation, location);
    }

    public getAllRepositores(): Repository[] {
        return this._gitApi.repositories;
    }
    public getRepository(repoUri: Uri): Repository | undefined {
        return this._repoMap.get(repoUri.toString());
    }

    dispose() {
        this.disposeForNow();
        this._disposable.dispose();
    }

    disposeForNow() {
        if(this._tree) {
            this._tree.dispose();
            this._tree = undefined;
        }

        this._onDidChangeBitbucketContext.dispose();
    }
}
