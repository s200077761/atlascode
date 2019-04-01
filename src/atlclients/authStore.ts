import { AuthInfo, AuthProvider, emptyAuthInfo, productForProvider } from './authInfo';
import { keychain } from '../util/keychain';
import { window, Disposable, EventEmitter, Event } from 'vscode';
import { Logger } from '../logger';
import { setCommandContext, CommandContext } from '../constants';
import { loggedOutEvent } from '../analytics';
import { Container } from '../container';
import debounce from 'lodash.debounce';

const keychainServiceName = "atlascode-authinfo";

export type AuthInfoEvent = {
    authInfo: AuthInfo | undefined;
    provider: string;
};

export class AuthManager implements Disposable {
    private _memStore: Map<string, AuthInfo> = new Map<string, AuthInfo>();
    private _debouncedKeychain = new Object();

    private _onDidAuthChange = new EventEmitter<AuthInfoEvent>();
    public get onDidAuthChange(): Event<AuthInfoEvent> {
        return this._onDidAuthChange.event;
    }

    dispose() {
        this._memStore.clear();
        this._onDidAuthChange.dispose();
    }

    private async getPassword(provider: string): Promise<string | null> {
        if (!this._debouncedKeychain[provider]) {
            this._debouncedKeychain[provider] = debounce(async () => await keychain!.getPassword(keychainServiceName, provider), 500, { leading: true });
        }
        return await this._debouncedKeychain[provider]();
    }

    public async isAuthenticated(provider: string, anyJira: boolean = true): Promise<boolean> {
        let info: AuthInfo | undefined = await this.getAuthInfo(provider);
        let isAuthed: boolean = (info !== undefined && info !== emptyAuthInfo);

        if (!isAuthed && anyJira && provider === AuthProvider.JiraCloud) {
            info = await this.getAuthInfo(AuthProvider.JiraCloudStaging);
            isAuthed = (info !== undefined && info !== emptyAuthInfo);
        }
        return isAuthed;
    }

    public async getAuthInfo(provider: string): Promise<AuthInfo | undefined> {
        if (this._memStore.has(provider)) {
            return this._memStore.get(provider) as AuthInfo;
        }

        if (keychain) {
            try {
                let infoEntry = await this.getPassword(provider) || undefined;
                if (infoEntry) {
                    let info: AuthInfo = JSON.parse(infoEntry);
                    this._memStore.set(provider, info);
                    return info;
                }
            } catch (e) {
                Logger.info(`keychain error ${e}`);
            }
        }

        return undefined;
    }

    public async saveAuthInfo(provider: string, info: AuthInfo): Promise<void> {
        const oldInfo = await this.getAuthInfo(provider);
        this._memStore.set(provider, info);

        const hasNewInfo = (!oldInfo || (oldInfo && oldInfo.access !== info.access));

        if (hasNewInfo) {
            const cmdctx = this.commandContextFor(provider);
            if (cmdctx !== undefined) {
                setCommandContext(cmdctx, info !== emptyAuthInfo ? true : false);
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

    private commandContextFor(provider: string): string | undefined {
        switch (provider) {
            case AuthProvider.JiraCloud:
                return CommandContext.IsJiraAuthenticated;
            case AuthProvider.JiraCloudStaging:
                return CommandContext.IsJiraStagingAuthenticated;
            case AuthProvider.BitbucketCloud:
                return CommandContext.IsBBAuthenticated;
            case AuthProvider.BitbucketCloudStaging:
                return undefined;
        }
        return undefined;
    }

    public async removeAuthInfo(provider: string): Promise<boolean> {
        const product = productForProvider(provider);

        let wasMemDeleted = this._memStore.delete(provider);
        let wasKeyDeleted = false;

        if (keychain) {
            wasKeyDeleted = await keychain.deletePassword(keychainServiceName, provider);
        }

        if (wasMemDeleted || wasKeyDeleted) {
            const cmdctx = this.commandContextFor(provider);
            if (cmdctx) {
                setCommandContext(cmdctx, false);
            }

            this._onDidAuthChange.fire({ authInfo: undefined, provider: provider });
            window.showInformationMessage(`You have been logged out of ${product}`);

            loggedOutEvent(product).then(e => { Container.analyticsClient.sendTrackEvent(e); });
            return true;
        }

        return false;
    }
}
