import { Disposable, ConfigurationChangeEvent, window, commands } from "vscode";
import { Time } from '../../util/time';
import { Container } from "../../container";
import { configuration } from "../../config/configuration";
import { PipelinesTree } from "./PipelinesTree";
import { setCommandContext, CommandContext, PipelinesTreeViewId } from "../../constants";
import { BitbucketContext } from "../../bitbucket/context";
import { PipelinesMonitor } from "./PipelinesMonitor";
import { Commands } from "../../commands";

const defaultRefreshInterval = 5 * Time.MINUTES;

export class PipelinesExplorer extends Disposable {
    private _disposable:Disposable;
    private _timer: any | undefined;
    private _refreshInterval = defaultRefreshInterval;
    private _tree: PipelinesTree | undefined;
    private _monitor: PipelinesMonitor | undefined;

    constructor(private _ctx: BitbucketContext) {
        super (() => this.dispose());

        commands.registerCommand(Commands.RefreshPipelines, this.refresh, this);

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
        this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);
        if (initializing || configuration.changed(e, 'bitbucket.pipelines.refreshInterval')) {
            this._refreshInterval = Container.config.bitbucket.pipelines.refreshInterval * Time.MINUTES;
        }

        if (initializing || configuration.changed(e, 'bitbucket.pipelines.explorerEnabled')) {
            if(!Container.config.bitbucket.pipelines.explorerEnabled) {
                this._tree = undefined;
            } else {
                const repos = this._ctx.getAllRepositores();
                if (repos.length > 0) {
                    this._tree = new PipelinesTree(repos);
                    window.createTreeView(PipelinesTreeViewId, {treeDataProvider: this._tree!});
                }
            }
            setCommandContext(CommandContext.PipelineExplorer, Container.config.bitbucket.pipelines.explorerEnabled);
        }

        if (initializing || configuration.changed(e, "bitbucket.pipelines.monitorEnabled")) {
            const repos = this._ctx.getAllRepositores();
            if (Container.config.bitbucket.pipelines.monitorEnabled) {
                this._monitor = new PipelinesMonitor(repos);
            } else {
                this._monitor = undefined;
            }
        }

        if (!Container.config.bitbucket.pipelines.explorerEnabled &&
            !Container.config.bitbucket.pipelines.monitorEnabled) {
            this.stopTimer();
        } else {
            this.stopTimer();
            this.startTimer();
        }
    }

    dispose() {
        this._disposable.dispose();
    }

    refresh() {
        if (this._tree) {
            this._tree.refresh();
        }
        if (this._monitor) {
            this._monitor.checkForNewResults();
        }
    }

    private startTimer() {
        if (this._refreshInterval > 0 && !this._timer) {
            this._timer = setInterval(() => {
                this.refresh();
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
