import { AuthInfo, AuthProvider, emptyAuthInfo } from './authInfo';
import { keychain } from '../util/keychain';
import { window, Disposable, EventEmitter, Event } from 'vscode';
import { Logger } from '../logger';
import { setCommandContext, CommandContext } from '../constants';
import { loggedOutEvent } from '../analytics';
import { Container } from '../container';

const keychainServiceName = "atlascode-authinfo";

export type AuthInfoEvent = {
    authInfo: AuthInfo | undefined;
    provider: string;
};

export class AuthManager implements Disposable {
    private _memStore: Map<string, AuthInfo> = new Map<string, AuthInfo>();

    private _onDidAuthChange = new EventEmitter<AuthInfoEvent>();
    public get onDidAuthChange(): Event<AuthInfoEvent> {
        return this._onDidAuthChange.event;
    }

    dispose() {
        this._memStore.clear();
        this._onDidAuthChange.dispose();
    }

    public async isAuthenticated(provider:string): Promise<boolean> {
        const info:AuthInfo|undefined = await this.getAuthInfo(provider);

        return (info !== undefined && info !== emptyAuthInfo);
    }
    public async getAuthInfo(provider: string): Promise<AuthInfo | undefined> {
        if (this._memStore.has(provider)) {
            return this._memStore.get(provider) as AuthInfo;
        }

        if (keychain) {
            try {
                let infoEntry = await keychain.getPassword(keychainServiceName, provider) || undefined;
                if (infoEntry) {
                    let info: AuthInfo = JSON.parse(infoEntry);
                    this._memStore.set(provider, info);
                    return info;
                }
            } catch { }
        }

        return undefined;
    }

    public async saveAuthInfo(provider: string, info: AuthInfo): Promise<void> {
        const oldInfo = await this.getAuthInfo(provider);
        this._memStore.set(provider, info);

        const hasNewInfo = (!oldInfo || (oldInfo && oldInfo.access !== info.access));

        if(hasNewInfo) {
            const cmdctx = provider === AuthProvider.JiraCloud ? CommandContext.IsJiraAuthenticated : CommandContext.IsBBAuthenticated;
            if(info !== emptyAuthInfo) {
                setCommandContext(cmdctx, true);
            } else {
                setCommandContext(cmdctx, false);
            }

            if (keychain) {
                try {
                    await keychain.setPassword(keychainServiceName, provider, JSON.stringify(info));
                }
                catch (e) {
                    Logger.debug("error saving auth info to keychain: ", e);
                }
            }

            this._onDidAuthChange.fire({ authInfo: info, provider: provider });
        }
    }

    public async removeAuthInfo(provider: string): Promise<boolean> {
        const product = provider === AuthProvider.JiraCloud ? "Jira" : "Bitbucket";

        let wasMemDeleted = this._memStore.delete(provider);
        let wasKeyDeleted = false;

        if (keychain) {
            wasKeyDeleted = await keychain.deletePassword(keychainServiceName, provider);
        }

        if(wasMemDeleted || wasKeyDeleted) {
            const cmdctx = provider === AuthProvider.JiraCloud ? CommandContext.IsJiraAuthenticated : CommandContext.IsBBAuthenticated;
            setCommandContext(cmdctx, false);
            this._onDidAuthChange.fire({ authInfo: undefined, provider: provider });
            window.showInformationMessage(`You have been logged out of ${product}`);

            loggedOutEvent(product).then(e => { Container.analyticsClient.sendTrackEvent(e); });
            return true;
        }

        return false;
    }
}
