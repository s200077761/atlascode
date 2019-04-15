import { Disposable, ConfigurationChangeEvent, TreeViewVisibilityChangeEvent, TreeDataProvider, TreeItem, window } from "vscode";
import { Container } from "../container";
import { configuration } from "../config/configuration";
import { BitbucketContext } from "../bitbucket/bbContext";
import { viewScreenEvent } from "../analytics";
import { AuthProvider } from "../atlclients/authInfo";
import { RefreshTimer } from "./RefreshTimer";
import { BaseNode } from "./nodes/baseNode";

export abstract class BitbucketExplorer extends Disposable {
    private _disposable: Disposable;

    protected tree: Tree | undefined;
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

    abstract viewId(): string;
    abstract explorerEnabledConfiguration(): string;
    abstract monitorEnabledConfiguration(): string;
    abstract refreshConfiguation(): string;

    abstract onConfigurationChanged(e: ConfigurationChangeEvent): void;
    abstract newTreeDataProvider(): Tree;
    abstract newMonitor(): BitbucketActivityMonitor;

    onBitbucketContextChanged() {
        this.updateMonitor();
        this.refresh();
    }

    async refresh() {
        if (!Container.onlineDetector.isOnline() ||
            !await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud)) {
            return;
        }

        if (this.tree) {
            this.tree.refresh();
        }
        if (this.monitor) {
            this.monitor.checkForNewActivity();
        }
    }

    dispose() {
        if (this.tree) {
            this.tree.dispose();
        }
        this._disposable.dispose();
    }

    private async _onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, this.explorerEnabledConfiguration())) {
            if (this.tree) {
                this.tree.dispose();
            }
            if (!configuration.get<boolean>(this.explorerEnabledConfiguration())) {
                this.tree = undefined;
            } else {
                this.tree = this.newTreeDataProvider();
            }
            if (this.tree) {
                const treeView = window.createTreeView(this.viewId(), { treeDataProvider: this.tree });
                treeView.onDidChangeVisibility(e => this.onDidChangeVisibility(e));
            }
        }

        if (initializing ||
            configuration.changed(e, this.monitorEnabledConfiguration()) ||
            configuration.changed(e, this.explorerEnabledConfiguration())) {

            this.updateMonitor();
        }

        this.onConfigurationChanged(e);
    }

    async onDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
        if (event.visible && await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud)) {
            viewScreenEvent(this.viewId()).then(e => { Container.analyticsClient.sendScreenEvent(e); });
        }
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

export abstract class Tree implements TreeDataProvider<BaseNode>, Disposable {
    getTreeItem(element: BaseNode): Promise<TreeItem> | TreeItem {
        return element.getTreeItem();
    }

    abstract getChildren(element?: BaseNode): Promise<BaseNode[]>;
    refresh() { }
    dispose() { }
}
