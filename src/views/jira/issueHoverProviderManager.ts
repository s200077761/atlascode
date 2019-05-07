import { Disposable, ConfigurationChangeEvent, languages } from 'vscode';
import { Container } from "../../container";
import { configuration, Configuration } from "../../config/configuration";
import { AuthInfoEvent } from "../../atlclients/authStore";
import { JiraHoverProviderConfigurationKey } from "../../constants";
import { AuthProvider } from "../../atlclients/authInfo";
import { IssueHoverProvider } from "./issueHoverProvider";

export class IssueHoverProviderManager implements Disposable {

    private _disposable: Disposable;
    private _hoverProviderDisposable: Disposable | undefined = undefined;

    constructor() {
        this._disposable = Disposable.from(
            Container.authManager.onDidAuthChange(this.onDidAuthChange, this),
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
        void this.onConfigurationChanged(Configuration.initializingChangeEvent);
    }

    private async onDidAuthChange(e: AuthInfoEvent) {
        if (e.provider === AuthProvider.JiraCloud && await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
            this.updateHover();
        } else {
            this.disposeHoverProvider();
        }
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = Configuration.initializing(e);
        if (initializing || Configuration.changed(e, JiraHoverProviderConfigurationKey)) {
            await this.updateHover();
        }
    }

    private async updateHover() {
        if (Container.config.jira.hover.enabled) {
            if (!this._hoverProviderDisposable) {
                this._hoverProviderDisposable = languages.registerHoverProvider({ scheme: 'file' }, new IssueHoverProvider());
            }
        } else {
            if (this._hoverProviderDisposable) {
                this.disposeHoverProvider();
            }
        }
    }

    private disposeHoverProvider() {
        if (this._hoverProviderDisposable) {
            this._hoverProviderDisposable.dispose();
        }
        this._hoverProviderDisposable = undefined;
    }

    dispose() {
        this.disposeHoverProvider();
        this._disposable.dispose();
    }
}
