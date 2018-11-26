import { AuthInfo, AuthProvider, emptyAuthInfo } from './authInfo';
import { keychain } from '../util/keychain';
import { window, Disposable, EventEmitter, Event } from 'vscode';
import { Logger } from '../logger';
import { setCommandContext, CommandContext } from '../constants';

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
        this._memStore.set(provider, info);

        const cmdctx = provider === AuthProvider.JiraCloud ? CommandContext.IsJiraAuthenticated : CommandContext.IsBBAuthenticated;
        if(info !== emptyAuthInfo) {
            setCommandContext(cmdctx, true);
        } else {
            setCommandContext(cmdctx, false);
        }

        this._onDidAuthChange.fire({ authInfo: info, provider: provider });
        if (keychain) {
            try {
                await keychain.setPassword(keychainServiceName, provider, JSON.stringify(info));
            }
            catch (e) {
                Logger.debug("error saving auth info to keychain: ", e);
            }
        }
    }

    public async removeAuthInfo(provider: string): Promise<boolean> {
        const product =
            provider === AuthProvider.JiraCloud ? "Jira" : "Bitbucket";

        this._memStore.delete(provider);

        const cmdctx = provider === AuthProvider.JiraCloud ? CommandContext.IsJiraAuthenticated : CommandContext.IsBBAuthenticated;
        setCommandContext(cmdctx, false);

        window.showInformationMessage(
            `You have been logged out of ${product}`
        );

        this._onDidAuthChange.fire({ authInfo: undefined, provider: provider });

        if (keychain) {
            return await keychain.deletePassword(keychainServiceName, provider);
        }

        return false;
    }
}
