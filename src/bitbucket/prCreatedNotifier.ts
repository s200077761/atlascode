import * as vscode from "vscode";
import { Time } from "../util/time";
import { BitbucketContext } from "./context";
import { PullRequestApi } from "./pullRequests";
import { Disposable, ConfigurationChangeEvent } from "vscode";
import { configuration, BitbucketExplorerLocation } from "../config/configuration";
import { Container } from "../container";
import { Commands } from "../commands";
import { AuthProvider } from "../atlclients/authInfo";

const defaultRefreshInterval = 10 * Time.MINUTES;

export class PullRequestCreatedNotifier implements Disposable {
    private _disposable: Disposable;
    private _newPrNotificationTimer: any | undefined;
    private _lastCheckedTime = new Map<String, Date>();
    private _refreshInterval = defaultRefreshInterval;

    constructor(private _bbCtx: BitbucketContext) {
        this._disposable = configuration.onDidChange(this.onConfigurationChanged, this);
        this._bbCtx.getAllRepositores().forEach(repo => this._lastCheckedTime.set(repo.rootUri.toString(), new Date()));

        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing
            || configuration.changed(e, 'bitbucket.explorer.enabled')
            || configuration.changed(e, 'bitbucket.explorer.notifications.pullRequestCreated')
            || configuration.changed(e, 'bitbucket.explorer.notifications.refreshInterval')) {

            this._refreshInterval = Container.config.bitbucket.explorer.notifications.refreshInterval > 0
                ? Container.config.bitbucket.explorer.notifications.refreshInterval * Time.MINUTES
                : defaultRefreshInterval;

            if (Container.config.bitbucket.explorer.enabled && Container.config.bitbucket.explorer.notifications.pullRequestCreated) {
                this.enable();
            } else {
                this.disable();
            }
        }
    }

    private enable() {
        this.disable();

        this._newPrNotificationTimer = setInterval(async () => {
            if (!await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud)) {
                return;
            }

            const promises = this._bbCtx.getAllRepositores().map(repo => {
                return PullRequestApi.getLatest(repo).then(prList => {
                    const lastChecked = this._lastCheckedTime.has(repo.rootUri.toString())
                        ? this._lastCheckedTime.get(repo.rootUri.toString())!
                        : new Date();
                    this._lastCheckedTime.set(repo.rootUri.toString(), new Date());

                    if (prList.data.length > 0 && Date.parse(prList.data[0].data.created_on!) > lastChecked.getTime()) {
                        return [repo.rootUri.path.split('/').pop()!];
                    }
                    return [];
                });
            });
            Promise.all(promises)
                .then(result => result.reduce((prev, curr) => prev.concat(curr), []))
                .then(notifiableRepos => {
                    if (notifiableRepos.length > 0) {
                        vscode.window.showInformationMessage(`New pull requests found for the following repositories: ${notifiableRepos.join(', ')}`, 'Show')
                            .then(usersChoice => {
                                if (usersChoice === 'Show') {
                                    const openLocationCommand = Container.config.bitbucket.explorer.location === BitbucketExplorerLocation.Atlascode
                                        ? 'workbench.view.extension.atlascode-drawer'
                                        : 'workbench.view.scm';
                                    vscode.commands.executeCommand(openLocationCommand);
                                    vscode.commands.executeCommand(Commands.BitbucketRefreshPullRequests);
                                }
                            });
                    }
                });
        }, this._refreshInterval);
    }

    private disable() {
        if (this._newPrNotificationTimer) {
            clearInterval(this._newPrNotificationTimer);
            this._lastCheckedTime.clear();
            this._newPrNotificationTimer = undefined;
        }
    }

    dispose() {
        this.disable();
        this._disposable.dispose();
    }
}