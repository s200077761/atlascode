import { SitesAvailableUpdateEvent } from 'src/siteManager';
import { ConfigurationChangeEvent, Disposable } from 'vscode';
import { ProductBitbucket } from '../atlclients/authInfo';
import { BitbucketContext } from '../bitbucket/bbContext';
import { configuration } from '../config/configuration';
import { BitbucketEnabledKey } from '../constants';
import { Container } from '../container';
import { BaseTreeDataProvider, Explorer } from './Explorer';
import { PullRequestNodeDataProvider } from './pullRequestNodeDataProvider';
import { RefreshTimer } from './RefreshTimer';

export abstract class BitbucketExplorer extends Explorer implements Disposable {
    private _disposable: Disposable;

    private monitor: BitbucketActivityMonitor | undefined;
    private _refreshTimer: RefreshTimer;

    constructor(protected ctx: BitbucketContext) {
        super(() => this.dispose());

        Container.context.subscriptions.push(configuration.onDidChange(this._onConfigurationChanged, this));

        this._refreshTimer = new RefreshTimer(this.explorerEnabledConfiguration(), this.refreshConfiguation(), () =>
            this.refresh()
        );
        this._disposable = Disposable.from(
            this.ctx.onDidChangeBitbucketContext(() => {
                this.onBitbucketContextChanged();
            }),
            Container.siteManager.onDidSitesAvailableChange(this.onSitesDidChange, this),
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
        if (!Container.onlineDetector.isOnline() || !Container.siteManager.productHasAtLeastOneSite(ProductBitbucket)) {
            return;
        }

        if (this.treeDataProvider) {
            this.treeDataProvider.refresh();
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
            if (this.treeDataProvider) {
                this.treeDataProvider.dispose();
            }
            if (!configuration.get<boolean>(this.explorerEnabledConfiguration())) {
                this.treeDataProvider = undefined;
            } else {
                this.treeDataProvider = this.newTreeDataProvider();
            }
            this.newTreeView();

            //We need the data provider to have a reference to the treeView...
            this.getDataProvider()?.setTreeView(this.treeView);
        }

        if (
            initializing ||
            configuration.changed(e, this.monitorEnabledConfiguration()) ||
            configuration.changed(e, this.explorerEnabledConfiguration())
        ) {
            this.updateMonitor();
        }

        this.onConfigurationChanged(e);
    }

    async onSitesDidChange(e: SitesAvailableUpdateEvent) {
        if (e.product.key === ProductBitbucket.key) {
            //After sites change, it takes some time for the new sites to be loaded...
            //There is a probably a better event to use but for now I can't find it.
            setTimeout(() => {
                if (!!this.getDataProvider()) {
                    (this.getDataProvider() as PullRequestNodeDataProvider).expandFirstPullRequestNode();
                }
            }, 1000);
        }
    }

    updateMonitor() {
        if (
            configuration.get<boolean>(this.explorerEnabledConfiguration()) &&
            configuration.get<boolean>(this.monitorEnabledConfiguration())
        ) {
            this.monitor = this.newMonitor();
        } else {
            this.monitor = undefined;
        }
    }
}
