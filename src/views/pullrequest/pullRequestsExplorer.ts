import { commands, window, Disposable, ConfigurationChangeEvent, TreeViewVisibilityChangeEvent, TreeView } from 'vscode';
import { BitbucketContext } from '../../bitbucket/bbContext';
import { Container } from '../../container';
import { configuration } from '../../config/configuration';
import { Commands } from '../../commands';
import { PullRequestTreeViewId, setCommandContext, CommandContext } from '../../constants';
import { AuthProvider } from '../../atlclients/authInfo';
import { viewScreenEvent } from '../../analytics';
import { BaseNode } from '../nodes/baseNode';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { PullRequestCreatedMonitor } from './pullRequestCreatedMonitor';
import { RefreshTimer } from '../RefreshTimer';

export class PullRequestsExplorer extends Disposable {

    private _tree: TreeView<BaseNode> | undefined;
    private _dataProvider: PullRequestNodeDataProvider;
    private _prCreatedNotifier: BitbucketActivityMonitor;
    private _refreshTimer: RefreshTimer;

    constructor(private _ctx: BitbucketContext) {
        super(() => this.dispose());

        this._dataProvider = new PullRequestNodeDataProvider(this._ctx);
        this._prCreatedNotifier = new PullRequestCreatedMonitor(this._ctx);

        Container.context.subscriptions.push(

            commands.registerCommand(Commands.BitbucketRefreshPullRequests, () => this.refresh()),
            commands.registerCommand(Commands.BitbucketShowPullRequestDetails, async (pr) => {
                await Container.pullRequestViewManager.createOrShow(pr);
            }),

            commands.registerCommand(Commands.CreatePullRequest, Container.pullRequestCreatorView.createOrShow, Container.pullRequestCreatorView),

            configuration.onDidChange(this.onConfigurationChanged, this),
            _ctx.onDidChangeBitbucketContext(() => this.refresh())
        );

        this._refreshTimer = new RefreshTimer('bitbucket.explorer.enabled', 'bitbucket.explorer.refreshInterval', () => this.refresh());
        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'bitbucket.explorer.enabled')) {
            if (!Container.config.bitbucket.explorer.enabled) {
                if (this._tree) {
                    this._tree.dispose();
                }
                this._tree = undefined;
            } else {
                this._tree = window.createTreeView(PullRequestTreeViewId, {
                    treeDataProvider: this._dataProvider
                });

                this._tree.onDidChangeVisibility(e => this.onDidChangeVisibility(e));
            }
            setCommandContext(CommandContext.BitbucketExplorer, Container.config.bitbucket.explorer.enabled);
        }
    }

    refresh() {
        if (!Container.onlineDetector.isOnline()) {
            return;
        }

        if (this._tree && this._dataProvider) {
            this._dataProvider.refresh();
        }
        if (this._prCreatedNotifier) {
            this._prCreatedNotifier.checkForNewActivity();
        }
    }

    async onDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
        this._refreshTimer.setActive(event.visible);
        if (event.visible && await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud)) {
            viewScreenEvent(PullRequestTreeViewId).then(e => { Container.analyticsClient.sendScreenEvent(e); });
        }
    }
}
