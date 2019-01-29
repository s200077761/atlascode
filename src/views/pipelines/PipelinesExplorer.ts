import { Disposable, ConfigurationChangeEvent, window } from "vscode";
import { Time } from '../../util/time';
import { Container } from "../../container";
import { configuration } from "../../config/configuration";
import { PipelinesTree } from "./PipelinesTree";
import { setCommandContext, CommandContext, PipelinesTreeViewId } from "../../constants";
import { BitbucketContext } from "../../bitbucket/context";

const defaultRefreshInterval = 5 * Time.MINUTES;

export class PipelinesExplorer extends Disposable {
    private _disposable:Disposable;
    private _timer: any | undefined;
    private _refreshInterval = defaultRefreshInterval;
    private _tree: PipelinesTree | undefined;

    constructor(private _ctx: BitbucketContext) {
        super (() => this.dispose());

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
        void this.onConfigurationChanged(configuration.initializingChangeEvent);    
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);
        if (initializing || configuration.changed(e, 'bitbucket.pipelines.explorer.enabled')) {
            if(!Container.config.bitbucket.pipelines.explorer.enabled) {
                this._tree = undefined;
            } else {
                const repos = this._ctx.getAllRepositores();
                if (repos.length > 0) {
                    this._tree = new PipelinesTree(repos);
                    window.createTreeView(PipelinesTreeViewId, {treeDataProvider: this._tree!});
                }
            }
            setCommandContext(CommandContext.PipelineExplorer, Container.config.bitbucket.pipelines.explorer.enabled);
        }


        if (this._refreshInterval <= 0) {
            this._refreshInterval = 0;
        }

        if (this._refreshInterval === 0 || !Container.config.bitbucket.pipelines.explorer.enabled) {
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