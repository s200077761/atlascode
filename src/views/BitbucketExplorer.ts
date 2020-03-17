import { SitesAvailableUpdateEvent } from 'src/siteManager';
import { ConfigurationChangeEvent, Disposable } from 'vscode';
import { ProductBitbucket } from '../atlclients/authInfo';
import { BitbucketContext } from '../bitbucket/bbContext';
import { configuration } from '../config/configuration';
import { BitbucketEnabledKey } from '../constants';
import { Container } from '../container';
import { BaseTreeDataProvider, Explorer } from './Explorer';
import { DescriptionNode, PullRequestTitlesNode } from './pullrequest/pullRequestNode';
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

    async attemptNodeExpansionNTimes(remainingAttempts: number, delay: number) {
        const dataProvider = this.getDataProvider();
        if (remainingAttempts === 0) {
            if (dataProvider) {
                const forceFocusedNode = await (dataProvider as PullRequestNodeDataProvider).getFirstPullRequestNode(
                    true
                );
                this.reveal(forceFocusedNode!, { focus: true });
            }
        }

        setTimeout(async () => {
            let prNode: PullRequestTitlesNode | undefined;
            if (dataProvider) {
                prNode = (await (dataProvider as PullRequestNodeDataProvider).getFirstPullRequestNode(
                    false
                )) as PullRequestTitlesNode;
            }
            if (prNode) {
                this.reveal(prNode, { focus: true, expand: true });
                const detailsNode: DescriptionNode = await (dataProvider as PullRequestNodeDataProvider).getDetailsNode(
                    prNode
                );
                this.reveal(detailsNode, { focus: true });
            } else {
                await this.attemptNodeExpansionNTimes(remainingAttempts - 1, delay);
            }
        }, delay);
    }

    async onSitesDidChange(e: SitesAvailableUpdateEvent) {
        if (e.product.key === ProductBitbucket.key && e.newSites) {
            //We attempt to expand the node 3 times with 1000ms delays in between. This is because after sites change, the PR explorer wipes its nodes and replaces them with simple nodes.
            //Only after it fetches data do those get replaced with useful nodes, but as of right now there doesn't appear to be a good way of detecting when new data is fetched, so
            //we make a few attempts at expanding the node in hopes that it will have been fetched by that time.
            this.attemptNodeExpansionNTimes(3, 1000);
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
