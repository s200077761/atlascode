import { commands, window, Disposable, ConfigurationChangeEvent, TreeViewVisibilityChangeEvent, TreeView } from 'vscode';
import { BitbucketContext } from '../../bitbucket/bbContext';
import { Container } from '../../container';
import { configuration } from '../../config/configuration';
import { Commands } from '../../commands';
import { PullRequestTreeViewId, setCommandContext, CommandContext } from '../../constants';
import { Time } from '../../util/time';
import { AuthProvider } from '../../atlclients/authInfo';
import { viewScreenEvent } from '../../analytics';
import { BaseNode } from '../nodes/baseNode';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { PullRequestCreatedNotifier } from './prCreatedNotifier';

const defaultRefreshInterval = 5 * Time.MINUTES;

export class PullRequestsExplorer extends Disposable {

    private _tree: TreeView<BaseNode> | undefined;
    private _dataProvider: PullRequestNodeDataProvider;
    private _timer: any | undefined;
    private _refreshInterval = defaultRefreshInterval;
    private _prCreatedNotifier: PullRequestCreatedNotifier;

    constructor(private _ctx: BitbucketContext) {
        super(() => this.dispose());

        this._dataProvider = new PullRequestNodeDataProvider(this._ctx);
        this._prCreatedNotifier = new PullRequestCreatedNotifier(this._ctx);

        Container.context.subscriptions.push(

            commands.registerCommand(Commands.BitbucketRefreshPullRequests, () => this.refresh()),
            commands.registerCommand(Commands.BitbucketShowPullRequestDetails, async (pr) => {
                await Container.pullRequestViewManager.createOrShow(pr);
            }),

            commands.registerCommand(Commands.CreatePullRequest, Container.pullRequestCreatorView.createOrShow, Container.pullRequestCreatorView),

            this._prCreatedNotifier,
            configuration.onDidChange(this.onConfigurationChanged, this),
            _ctx.onDidChangeBitbucketContext(() => this.refresh())
        );

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
                this._ctx.refreshRepos();
            }
            setCommandContext(CommandContext.BitbucketExplorer, Container.config.bitbucket.explorer.enabled);
        }

        if (initializing || configuration.changed(e, 'bitbucket.explorer.refreshInterval')) {
            if (Container.config.bitbucket.explorer.refreshInterval === 0) {
                this._refreshInterval = 0;
                this.stopTimer();
            } else {
                this._refreshInterval = Container.config.bitbucket.explorer.refreshInterval > 0
                    ? Container.config.bitbucket.explorer.refreshInterval * Time.MINUTES
                    : defaultRefreshInterval;
                this.stopTimer();
                this.startTimer();
            }
        }
    }

    refresh() {
        if (!Container.onlineDetector.isOnline()) {
            return;
        }

        if (this._tree && this._dataProvider) {
            this._dataProvider.refresh();
        }
    }

    async onDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
        if (event.visible && await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud)) {
            this._ctx.refreshRepos();
            viewScreenEvent(PullRequestTreeViewId).then(e => { Container.analyticsClient.sendScreenEvent(e); });
            this.startTimer();
        } else {
            this.stopTimer();
        }
    }

    private startTimer() {
        if (!this._timer && this._refreshInterval > 0) {
            this._timer = setInterval(() => {
                if (this._tree && this._dataProvider) {
                    this.refresh();
                }
            }, this._refreshInterval);
        }
    }

    private stopTimer() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
    }
}
