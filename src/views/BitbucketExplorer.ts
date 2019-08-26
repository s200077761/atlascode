import { Disposable, ConfigurationChangeEvent } from "vscode";
import { Container } from "../container";
import { configuration } from "../config/configuration";
import { BitbucketContext } from "../bitbucket/bbContext";
import { ProductBitbucket } from "../atlclients/authInfo";
import { RefreshTimer } from "./RefreshTimer";
import { Explorer, BaseTreeDataProvider } from "./Explorer";
import { BitbucketEnabledKey } from "../constants";

export abstract class BitbucketExplorer extends Explorer implements Disposable {
    private _disposable: Disposable;

    private monitor: BitbucketActivityMonitor | undefined;
    private _refreshTimer: RefreshTimer;

    constructor(protected ctx: BitbucketContext) {
        super(() => this.dispose());

        Container.context.subscriptions.push(
            configuration.onDidChange(this._onConfigurationChanged, this)
        );

        this._refreshTimer = new RefreshTimer(this.explorerEnabledConfiguration(), this.refreshConfiguation(), () => this.refresh());
        this._disposable = Disposable.from(
            this.ctx.onDidChangeBitbucketContext(() => {
                this.onBitbucketContextChanged();
            }),
            this._refreshTimer
        );
        this._onConfigurationChanged(configuration.initializingChangeEvent);
    }

    abstract explorerEnabledConfiguration(): string;
    bitbucketEnabledConfiguration(): string {
        return BitbucketEnabledKey;
    }

    abstract monitorEnabledConfiguration(): string;
    abstract refreshConfiguation(): string;

    abstract onConfigurationChanged(e: ConfigurationChangeEvent): void;
    abstract newTreeDataProvider(): BaseTreeDataProvider;
    abstract newMonitor(): BitbucketActivityMonitor;

    product() {
        return ProductBitbucket;
    }

    onBitbucketContextChanged() {
        this.updateMonitor();
        this.refresh();
    }

    async refresh() {
        if (!Container.onlineDetector.isOnline() ||
            !await Container.siteManager.productHasAtLeastOneSite(ProductBitbucket)) {
            return;
        }

        if (this.treeDataProvder) {
            this.treeDataProvder.refresh();
        }
        if (this.monitor && configuration.get<boolean>(this.bitbucketEnabledConfiguration())) {
            this.monitor.checkForNewActivity();
        }
    }

    dispose() {
        console.log('bitbucket explorer disposed');
        super.dispose();
        this._disposable.dispose();
    }

    private async _onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, this.explorerEnabledConfiguration())) {
            if (this.treeDataProvder) {
                this.treeDataProvder.dispose();
            }
            if (!configuration.get<boolean>(this.explorerEnabledConfiguration())) {
                this.treeDataProvder = undefined;
            } else {
                this.treeDataProvder = this.newTreeDataProvider();
            }
            this.newTreeView();
        }

        if (initializing ||
            configuration.changed(e, this.monitorEnabledConfiguration()) ||
            configuration.changed(e, this.explorerEnabledConfiguration())) {

            this.updateMonitor();
        }

        this.onConfigurationChanged(e);
    }

    updateMonitor() {
        if (configuration.get<boolean>(this.explorerEnabledConfiguration()) &&
            configuration.get<boolean>(this.monitorEnabledConfiguration())) {
            this.monitor = this.newMonitor();
        } else {
            this.monitor = undefined;
        }
    }
}
