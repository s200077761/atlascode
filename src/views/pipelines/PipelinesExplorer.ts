import { Disposable, ConfigurationChangeEvent, window, commands, TreeViewVisibilityChangeEvent } from "vscode";
import { Container } from "../../container";
import { configuration } from "../../config/configuration";
import { PipelinesTree } from "./PipelinesTree";
import { setCommandContext, CommandContext, PipelinesTreeViewId } from "../../constants";
import { BitbucketContext } from "../../bitbucket/bbContext";
import { PipelinesMonitor } from "./PipelinesMonitor";
import { Commands } from "../../commands";
import { AuthProvider } from "../../atlclients/authInfo";
import { viewScreenEvent } from "../../analytics";
import { RefreshTimer } from "../RefreshTimer";

export class PipelinesExplorer extends Disposable {
    private _disposable: Disposable;
    private _tree: PipelinesTree | undefined;
    private _monitor: BitbucketActivityMonitor | undefined;
    private _refreshTimer: RefreshTimer;

    constructor(private _ctx: BitbucketContext) {
        super(() => this.dispose());

        commands.registerCommand(Commands.RefreshPipelines, this.refresh, this);

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
        this.onConfigurationChanged(configuration.initializingChangeEvent);
        this._refreshTimer = new RefreshTimer('bitbucket.pipelines.explorerEnabled', 'bitbucket.pipelines.refreshInterval', () => this.refresh());
        this._disposable = Disposable.from(
            this._ctx.onDidChangeBitbucketContext(() => {
                this.updateMonitor();
                this.refresh();
            }),
        );
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'bitbucket.pipelines.explorerEnabled')) {
            if (!Container.config.bitbucket.pipelines.explorerEnabled) {
                if (this._tree) {
                    this._tree.dispose();
                }
                this._tree = undefined;
            } else {
                this._tree = new PipelinesTree();
                const treeView = window.createTreeView(PipelinesTreeViewId, { treeDataProvider: this._tree! });
                treeView.onDidChangeVisibility(e => this.onTreeDidChangeVisibility(e));
            }
            setCommandContext(CommandContext.PipelineExplorer, Container.config.bitbucket.pipelines.explorerEnabled);
        }

        if (initializing ||
            configuration.changed(e, 'bitbucket.pipelines.monitorEnabled') ||
            configuration.changed(e, 'bitbucket.pipelines.explorerEnabled')) {

            this.updateMonitor();
        }
    }

    updateMonitor() {
        if (Container.config.bitbucket.pipelines.explorerEnabled &&
            Container.config.bitbucket.pipelines.monitorEnabled) {
            const repos = this._ctx.getBitbucketRepositores();
            this._monitor = new PipelinesMonitor(repos);
        } else {
            this._monitor = undefined;
        }
    }

    dispose() {
        this._disposable.dispose();
        this._refreshTimer.setActive(false);
    }

    refresh() {
        if (!Container.onlineDetector.isOnline()) {
            return;
        }

        if (this._tree) {
            this._tree.refresh();
        }
        if (this._monitor) {
            this._monitor.checkForNewActivity();
        }
    }

    async onTreeDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
        if (event.visible && await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud)) {
            viewScreenEvent(PipelinesTreeViewId).then(e => { Container.analyticsClient.sendScreenEvent(e); });
        }
    }
}
