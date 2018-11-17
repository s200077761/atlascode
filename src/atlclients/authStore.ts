import { AuthInfo, AuthProvider } from './authInfo';
import { keychain } from '../util/keychain';
import { window, Disposable, EventEmitter, Event } from 'vscode';

const keychainServiceName = "atlascode-authinfo";

export type AuthInfoEvent = {
    authInfo:AuthInfo|undefined;
    provider:string;
};

export class AuthManager implements Disposable {
    private _memStore:Map<string,AuthInfo> = new Map<string,AuthInfo>();

    private _onDidAuthChange = new EventEmitter<AuthInfoEvent>();
    public get onDidAuthChange(): Event<AuthInfoEvent> {
        return this._onDidAuthChange.event;
    }

    dispose() {
        this._memStore.clear();
    }

    public async getAuthInfo(provider:string):Promise<AuthInfo | undefined> {
        if (this._memStore.has(provider)) {
            return this._memStore.get(provider) as AuthInfo;
        }
        
        if (keychain) {
            try {
                let infoEntry = await keychain.getPassword(keychainServiceName, provider) || undefined;
                if (infoEntry) {
                    let info:AuthInfo = JSON.parse(infoEntry);
                    this._memStore.set(provider,info);
                    return info;
                }
            } catch { }
        }

        return undefined;
    }

    public async saveAuthInfo(provider:string, info:AuthInfo):Promise<void> {
        this._memStore.set(provider,info);
        
        this._onDidAuthChange.fire({authInfo:info,provider:provider});
        if (keychain) {
            return await keychain.setPassword(keychainServiceName,provider,JSON.stringify(info));
        }
    }

    public async removeAuthInfo(provider:string):Promise<boolean> {
        const product =
        provider === AuthProvider.JiraCloud ? "Jira" : "Bitbucket";

        this._memStore.delete(provider);

        window.showInformationMessage(
            `You have been logged out of ${product}`
          );

        this._onDidAuthChange.fire({authInfo:undefined,provider:provider});

        if (keychain) {
            return await keychain.deletePassword(keychainServiceName,provider);
        }

        return false;
    }
}
