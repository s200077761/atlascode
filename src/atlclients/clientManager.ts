import {
    window,
    ConfigurationChangeEvent,
    ExtensionContext,
    Disposable,
  } from "vscode";
  import * as BitbucketKit from "bitbucket";
  import * as JiraKit from "@atlassian/jira";
  import { AuthProvider, AuthInfo } from "./authInfo";
  import { Container } from "../container";
  import { OAuthDancer } from "./oauthDancer";
  import { CacheMap, Interval } from "../util/cachemap";
  import { Logger } from "../logger";
  var tunnel = require("tunnel");
  import * as fs from "fs";
  import { configuration, WorkingSite, emptyWorkingSite } from "../config/configuration";
  import { Resources } from "../resources";
  
  const SIGNIN_COMMAND = "Sign in";
  
  interface EmptyClient {
    isEmpty: boolean;
  }
  
  function isEmptyClient(a: any): a is EmptyClient {
    return a && (<EmptyClient>a).isEmpty !== undefined;
  }
  
  const emptyClient: EmptyClient = { isEmpty: true };
  
  // TODO: VSCODE-29 if user bails in oauth or an error happens, we need to return undefined
  export class ClientManager implements Disposable {
    private _clients: CacheMap = new CacheMap();
    private _dancer: OAuthDancer = new OAuthDancer();
    private _agent: any | undefined;
    private _optionsDirty: boolean = false;
    private _isAuthenticating: boolean = false;
  
    constructor(context: ExtensionContext) {
      context.subscriptions.push(
        configuration.onDidChange(this.onConfigurationChanged, this)
      );
      this.onConfigurationChanged(configuration.initializingChangeEvent);
    }
  
    dispose() {
      this._clients.clear();
      
    }
  
    public async bbrequest(promptForAuth:boolean = true): Promise<BitbucketKit | undefined> {
      return this.getClient<BitbucketKit>(
        AuthProvider.BitbucketCloud,
        info => {
          let extraOptions = {};
          if (this._agent) {
            extraOptions = { agent: this._agent };
          }
  
          let bbclient = new BitbucketKit({ options: extraOptions });
          bbclient.authenticate({ type: "token", token: info.access });
  
          return bbclient;
        }, promptForAuth
      );
    }
  
    public async jirarequest(workingSite?: WorkingSite, promptForAuth:boolean = true): Promise<JiraKit | undefined> {
      return this.getClient<JiraKit>(AuthProvider.JiraCloud, info => {
        let cloudId: string = "";
        Logger.debug("jirarequest",workingSite);
        if (!workingSite || workingSite === emptyWorkingSite) {
            workingSite = Container.config.jira.workingSite;
        } 
        if (info.accessibleResources) {
          if (workingSite) {
            const foundSite = info.accessibleResources.find(site => site.id === workingSite!.id);
            if (foundSite) {
              cloudId = foundSite.id;
            }
          }
          if(cloudId === "") {
            cloudId = info.accessibleResources[0].id;
          }
        }
  
        let extraOptions = {};
        if (this._agent) {
          extraOptions = { agent: this._agent };
        }
  
        let jraclient = new JiraKit({
          baseUrl: `https://api.atlassian.com/ex/jira/${cloudId}/rest/`,
          options: extraOptions
        });
        jraclient.authenticate({ type: "token", token: info.access });
  
        return jraclient;
      }, promptForAuth);
    }
  
    public async removeClient(provider: string) {
      this._clients.deleteItem(provider);
    }
  
    private async getClient<T>(
      provider: string,
      factory: (info: AuthInfo) => any,
      promptUser:boolean = true
    ): Promise<T | undefined> {
      type TorEmpty = T | EmptyClient;
  
      let clientOrEmpty = await this._clients.getItem<TorEmpty>(provider);
  
      if (isEmptyClient(clientOrEmpty)) {
        return undefined;
      }
  
      let client: T | undefined = clientOrEmpty;
  
      if (!client) {
        let info = await Container.authManager.getAuthInfo(provider);
  
        if (!info) {
          info = await this.danceWithUser(provider,promptUser);
  
          if (info) {
            await Container.authManager.saveAuthInfo(provider, info);

            const product = provider === AuthProvider.JiraCloud ? "Jira" : "Bitbucket";
            window.showInformationMessage(
              `You are now authenticated with ${product}`
            );
          } else {
            return undefined;
          }
        } else {
          await this._dancer
            .refresh(info)
            .then(async newInfo => {
              info = newInfo;
              await Container.authManager.saveAuthInfo(provider, info);
            })
            .catch(async () => {
              await Container.authManager.removeAuthInfo(provider);
              info = await this.danceWithUser(provider);
  
              if (info) {
                await Container.authManager.saveAuthInfo(provider, info);
                return info;
              } else {
                return undefined;
              }
            });
        }
  
        client = factory(info);
  
        await this._clients.setItem(provider, client, 45 * Interval.MINUTE);
      }
  
      if (this._optionsDirty) {
        let info = await Container.authManager.getAuthInfo(provider);
  
        if (info) {
          client = factory(info);
          await this._clients.updateItem(provider, client);
        }
  
        this._optionsDirty = false;
      }
      return client;
    }
  
    private async danceWithUser(
      provider: string,
      promptUser:boolean = true
    ): Promise<AuthInfo | undefined> {
      const product =
        provider === AuthProvider.JiraCloud ? "Jira" : "Bitbucket";
  
      if (!this._isAuthenticating) {
        this._isAuthenticating = true;
      } else {
        return await this.getInLine(provider);
      }
      
      let usersChoice = undefined;

      if(promptUser) {
        usersChoice = await window.showInformationMessage(
          `In order to use some Atlascode functionality, you need to sign in to ${product}`,
          SIGNIN_COMMAND
        );
      } else {
        usersChoice = SIGNIN_COMMAND;
      }
  
      if (usersChoice === SIGNIN_COMMAND) {
        let info = await this._dancer.doDance(provider).catch(reason => {
          window.showErrorMessage(`Error logging into ${product}`, reason);
          this._isAuthenticating = false;
          return undefined;
        });
        this._isAuthenticating = false;
        return info;
      } else {
        // user cancelled sign in, remember that and don't ask again until it expires
        await this._clients.setItem(provider, emptyClient, 45 * Interval.MINUTE);
        this._isAuthenticating = false;
        return undefined;
      }
    }
    
    public async authenticate(provider:string): Promise<void> {
      this._clients.deleteItem(provider);
      switch(provider) {
        case AuthProvider.JiraCloud: {
          await this.jirarequest(undefined,false);
          break;
        }
        case AuthProvider.BitbucketCloud: {
          await this.bbrequest(false);
          break;
        }
      }
    }

    private async getInLine(
      provider: string
    ): Promise<AuthInfo | undefined> {
      while (this._isAuthenticating) {
        await this.delay(1000);
      }
  
      return await Container.authManager.getAuthInfo(provider);
    }
  
    
  
    private delay(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  
    private onConfigurationChanged(e: ConfigurationChangeEvent) {
      const section = "enableCharles";
      this._optionsDirty = true;
      Logger.debug(
        "client manager got config change, charles? " +
          configuration.get<boolean>(section)
      );
      if (configuration.isDebugging && configuration.get<boolean>(section)) {
        this._agent = tunnel.httpsOverHttp({
          ca: [fs.readFileSync(Resources.charlesCert)],
          proxy: {
            host: "127.0.0.1",
            port: 8888
          }
        });
      } else {
        this._agent = undefined;
      }
    }
  }