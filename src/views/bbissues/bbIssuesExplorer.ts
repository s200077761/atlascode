import { Disposable, ConfigurationChangeEvent, window, commands, TreeViewVisibilityChangeEvent, TreeView } from "vscode";
import { Container } from "../../container";
import { configuration } from "../../config/configuration";
import { setCommandContext, CommandContext, BitbucketIssuesTreeViewId } from "../../constants";
import { BitbucketContext } from "../../bitbucket/bbContext";
import { Commands } from "../../commands";
import { AuthProvider } from "../../atlclients/authInfo";
import { viewScreenEvent } from "../../analytics";
import { BitbucketIssuesDataProvider } from "../bitbucketIssuesDataProvider";
import { BaseNode } from "../nodes/baseNode";
import { BitbucketIssuesMonitor } from "./bbIssuesMonitor";
import { RefreshTimer } from "../RefreshTimer";

export class BitbucketIssuesExplorer extends Disposable {
    private _disposable: Disposable;
    private _tree: TreeView<BaseNode> | undefined;
    private _bitbucketIssuesDataProvider: BitbucketIssuesDataProvider;
    private _monitor: BitbucketActivityMonitor | undefined;
    private _refreshTimer: RefreshTimer;

    constructor(private _ctx: BitbucketContext) {
        super(() => this.dispose());

        this._bitbucketIssuesDataProvider = new BitbucketIssuesDataProvider(_ctx);

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
        this._refreshTimer = new RefreshTimer('bitbucket.issues.explorerEnabled', 'bitbucket.issues.refreshInterval', () => this.refresh());
        this._disposable = Disposable.from(
            this._ctx.onDidChangeBitbucketContext(() => {
                this.updateMonitor();
                this.refresh();
            }),
            commands.registerCommand(Commands.BitbucketIssuesRefresh, this.refresh, this),
            commands.registerCommand(Commands.CreateBitbucketIssue, Container.createBitbucketIssueWebview.createOrShow, Container.createBitbucketIssueWebview)
        );

        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'bitbucket.issues.explorerEnabled')) {
            if (!Container.config.bitbucket.issues.explorerEnabled) {
                if (this._tree) {
                    this._tree.dispose();
                }
                this._tree = undefined;
            } else {
                this._tree = window.createTreeView(BitbucketIssuesTreeViewId, {
                    treeDataProvider: this._bitbucketIssuesDataProvider
                });
                this._tree.onDidChangeVisibility(e => this.onTreeDidChangeVisibility(e));
            }
            setCommandContext(CommandContext.BitbucketIssuesExplorer, Container.config.bitbucket.issues.explorerEnabled);
        }

        if (initializing ||
            configuration.changed(e, 'bitbucket.issues.explorerEnabled') ||
            configuration.changed(e, 'bitbucket.issues.monitorEnabled')) {

            this.updateMonitor();
        }
    }

    updateMonitor() {
        if (Container.config.bitbucket.issues.explorerEnabled &&
            Container.config.bitbucket.issues.monitorEnabled) {
            const repos = this._ctx.getBitbucketRepositores();
            this._monitor = new BitbucketIssuesMonitor(repos);
        } else {
            this._monitor = undefined;
        }
    }

    dispose() {
        if (this._bitbucketIssuesDataProvider) {
            this._bitbucketIssuesDataProvider.dispose();
        }
        if (this._tree) {
            this._tree.dispose();
        }
        this._disposable.dispose();
        this._refreshTimer.setActive(false);
    }

    refresh() {
        if (!Container.onlineDetector.isOnline()) {
            return;
        }

        if (this._tree && this._bitbucketIssuesDataProvider) {
            this._bitbucketIssuesDataProvider.refresh();
        }
        if (this._monitor) {
            this._monitor.checkForNewActivity();
        }
    }

    async onTreeDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
        if (event.visible && await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud)) {
            viewScreenEvent(BitbucketIssuesTreeViewId).then(e => { Container.analyticsClient.sendScreenEvent(e); });
        }
    }
}
