import * as BitbucketKit from 'bitbucket';
import { JiraKit } from './jirakit/jirakit';
import * as authinfo from './authInfo';
import { AuthStore } from './authStore';
import { OAuthDancer } from './oauthDancer';
import { CacheMap, Interval } from '../util/cachemap';
import { Logger } from '../logger';

// TODO: VSCODE-29 if user bails in oauth or an error happens, we need to return undefined
class ClientManager {
    private _clients:CacheMap = new CacheMap();
    private _dancer:OAuthDancer = new OAuthDancer();

    public async bbrequest():Promise<BitbucketKit | undefined> {
        Logger.debug("getting bb client");
        
        return this.getClient<BitbucketKit>(authinfo.AuthProvider.BitbucketCloud,(info)=>{
            let bbclient = new BitbucketKit();
            bbclient.authenticate({type: 'token', token: info.access});

            return bbclient;
        });
    }

    public async jirarequest():Promise<JiraKit | undefined> {
        Logger.debug("getting jira client");
        
        return this.getClient<JiraKit>(authinfo.AuthProvider.JiraCloud,(info)=>{
            let jraclient = new JiraKit();
            jraclient.authenticate({type: 'token', token: info.access});

            return jraclient;
        });
    }

    private async getClient<T>(provider:string, factory:(info:authinfo.AuthInfo)=>any):Promise<T | undefined> {
        Logger.debug("getting client");
        let client = await this._clients.getItem<T>(provider);

        if (!client) {
            let info = await AuthStore.getAuthInfo(provider);

            if (!info) {
                // TODO: VSCODE-28 login with confirmation
                info = await this._dancer.doDance(provider);
            } else {
                info = await this._dancer.refresh(info);
            }

            Logger.debug("info is: " + JSON.stringify(info,null,2));
            Logger.debug("token is: " + info.access);
            client = factory(info);
            
            await this._clients.setItem(provider, client, 45 * Interval.MINUTE);
        }
        
        return client;
    }

}

export const Atl = new ClientManager();