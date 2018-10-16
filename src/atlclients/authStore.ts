import * as authinfo from './authInfo';
import { keychain } from '../util/keychain';

const keychainServiceName = "atlascode-authinfo";

class AuthManager {
    private _memStore:Map<string,authinfo.AuthInfo> = new Map<string,authinfo.AuthInfo>();

    public async getAuthInfo(provider:string):Promise<authinfo.AuthInfo | undefined> {
        if (this._memStore.has(provider)) {
            return this._memStore.get(provider) as authinfo.AuthInfo;
        }
        
        if (keychain) {
            try {
                let infoEntry = await keychain.getPassword(keychainServiceName, provider) || undefined;
                if (infoEntry) {
                    let info:authinfo.AuthInfo = JSON.parse(infoEntry);
                    this._memStore.set(provider,info);
                    return info;
                }
            } catch { }
        }

        return undefined;
    }

    public async saveAuthInfo(provider:string, info:authinfo.AuthInfo):Promise<void> {
        this._memStore.set(provider,info);
        
        if (keychain) {
            return await keychain.setPassword(keychainServiceName,provider,JSON.stringify(info));
        }
    }

    public async removeAuthInfo(provider:string):Promise<boolean> {
        this._memStore.delete(provider);
        
        if (keychain) {
            return await keychain.deletePassword(keychainServiceName,provider);
        }

        return false;
    }
}

export const AuthStore = new AuthManager();