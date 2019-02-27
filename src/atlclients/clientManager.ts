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
var tunnel = require("tunnel");
import * as fs from "fs";
import { configuration, WorkingSite, isEmptySite } from "../config/configuration";
import { Resources } from "../resources";
import { authenticatedEvent } from "../analytics";
import { ProductJira, ProductBitbucket } from "../constants";

// const SIGNIN_COMMAND = "Sign in";

interface EmptyClient {
  isEmpty: boolean;
}

function isEmptyClient(a: any): a is EmptyClient {
  return a && (<EmptyClient>a).isEmpty !== undefined;
}

// const emptyClient: EmptyClient = { isEmpty: true };

// TODO: VSCODE-29 if user bails in oauth or an error happens, we need to return undefined
export class ClientManager implements Disposable {
  private _clients: CacheMap = new CacheMap();
  private _dancer: OAuthDancer = new OAuthDancer();
  private _agent: any | undefined;
  private _optionsDirty: boolean = false;
  // private _isAuthenticating: boolean = false;
  // private _isGettingClient: Map<string, boolean> = new Map<string, boolean>();

  constructor(context: ExtensionContext) {
    context.subscriptions.push(
      configuration.onDidChange(this.onConfigurationChanged, this)
    );
    this.onConfigurationChanged(configuration.initializingChangeEvent);
  }

  dispose() {
    this._clients.clear();

  }

  public async bbrequest(reauthenticate: boolean = false): Promise<BitbucketKit | undefined> {
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
      }, false, reauthenticate
    );
  }

  public async bbrequestStaging(reauthenticate: boolean = false): Promise<BitbucketKit | undefined> {
    return this.getClient<BitbucketKit>(
      AuthProvider.BitbucketCloudStaging,
      info => {
        let extraOptions = {};
        if (this._agent) {
          extraOptions = { agent: this._agent };
        }

        let bbclient = new BitbucketKit({ baseUrl: "https://api-staging.bb-inf.net/2.0", options: extraOptions });
        bbclient.authenticate({ type: "token", token: info.access });

        return bbclient;
      }, false, reauthenticate
    );
  }

  public async jirarequest(workingSite?: WorkingSite, reauthenticate: boolean = false): Promise<JiraKit | undefined> {
    // if workingSite is passed in and is different from the one in config, 
    // it is for a one-off request (eg. a request from webview from previously configured workingSite)
    const doNotUpdateCache = workingSite && workingSite.id !== Container.config.jira.workingSite.id;

    return this.getClient<JiraKit>(AuthProvider.JiraCloud, info => {
      let cloudId: string = "";
      if (!workingSite || isEmptySite(workingSite)) {
        workingSite = Container.config.jira.workingSite;
      }
      if (info.accessibleResources) {
        if (workingSite && !isEmptySite(workingSite)) {
          const foundSite = info.accessibleResources.find(site => site.id === workingSite!.id);
          if (foundSite) {
            cloudId = foundSite.id;
          }
        }
        if (cloudId === "") {
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
    }, doNotUpdateCache, reauthenticate);
  }

  public async removeClient(provider: string) {
    this._clients.deleteItem(provider);
  }

  private async getClient<T>(
    provider: string,
    factory: (info: AuthInfo) => any,
    doNotUpdateCache: boolean = true,
    reauthenticate: boolean = false
  ): Promise<T | undefined> {
    type TorEmpty = T | EmptyClient;

    const clientOrEmpty = await this._clients.getItem<TorEmpty>(provider);

    if (isEmptyClient(clientOrEmpty)) {
      return undefined;
    }

    let client: T | undefined = clientOrEmpty;

    if (!client || reauthenticate) {

      // if (!this.isLocked(provider)) {
      //   this.lockClient(provider);
      // } else {
      //   return await this.getInClientLine<T>(provider);
      // }

      let info = await Container.authManager.getAuthInfo(provider);

      if (!info || reauthenticate) {
        info = await this.danceWithUser(provider);

        if (info) {
          await Container.authManager.saveAuthInfo(provider, info);

          const product = provider === AuthProvider.JiraCloud ? ProductJira : ProductBitbucket;
          window.showInformationMessage(`You are now authenticated with ${product}`);
          authenticatedEvent(product).then(e => { Container.analyticsClient.sendTrackEvent(e); });
        } else {
          // this.unlockClient(provider);
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
              // this.unlockClient(provider);
              return info;
            } else {
              // this.unlockClient(provider);
              return undefined;
            }
          });
      }

      client = factory(info);

      await this._clients.setItem(provider, client, 45 * Interval.MINUTE);
    }


    if (doNotUpdateCache) {
      let info = await Container.authManager.getAuthInfo(provider);

      if (info) {
        client = factory(info);
      }
    }

    if (this._optionsDirty) {
      let info = await Container.authManager.getAuthInfo(provider);

      if (info) {
        client = factory(info);
        await this._clients.updateItem(provider, client);
      }

      this._optionsDirty = false;
    }

    // this.unlockClient(provider);
    return client;
  }

  // private isLocked(provider: string): boolean {
  //   let locked = this._isGettingClient.get(provider);
  //   if (locked === undefined) { locked = false; }

  //   return locked;
  // }

  // private lockClient(provider: string) {
  //   this._isGettingClient.set(provider, true);
  // }

  // private unlockClient(provider: string) {
  //   this._isGettingClient.set(provider, false);
  // }

  // private async getInClientLine<T>(provider: string): Promise<T | undefined> {
  //   while (this.isLocked(provider)) {
  //     await this.delay(1000);
  //   }

  //   return await this._clients.getItem<T>(provider);
  // }

  private async danceWithUser(
    provider: string
  ): Promise<AuthInfo | undefined> {
    const product =
      provider === AuthProvider.JiraCloud ? ProductJira : ProductBitbucket;

    // if (!this._isAuthenticating) {
    //   this._isAuthenticating = true;
    // } else {
    //   return await this.getInAuthLine(provider);
    // }

    // let usersChoice = undefined;

    // if (promptUser) {
    //   usersChoice = await window.showInformationMessage(
    //     `In order to use some Atlassian functionality, you need to sign in to ${product}`,
    //     SIGNIN_COMMAND
    //   );
    // } else {
    //   usersChoice = SIGNIN_COMMAND;
    // }

    // if (usersChoice === SIGNIN_COMMAND) {
    let info = await this._dancer.doDance(provider).catch(reason => {
      window.showErrorMessage(`Error logging into ${product}`, reason);
      // this._isAuthenticating = false;
      return undefined;
    });
    // this._isAuthenticating = false;
    return info;
    // } else {
    //   // user cancelled sign in, remember that and don't ask again until it expires
    //   await this._clients.setItem(provider, emptyClient, 45 * Interval.MINUTE);
    //   this._isAuthenticating = false;
    //   return undefined;
    // }
  }

  public async authenticate(provider: string): Promise<void> {
    if (isEmptyClient(this._clients.getItem(provider))) {
      this._clients.deleteItem(provider);
    }

    switch (provider) {
      case AuthProvider.JiraCloud: {
        await this.jirarequest(undefined, true);
        break;
      }
      case AuthProvider.BitbucketCloud: {
        await this.bbrequest(true);
        break;
      }
      case AuthProvider.BitbucketCloudStaging: {
        await this.bbrequestStaging(true);
        break;
      }
    }
  }

  // private async getInAuthLine(provider: string): Promise<AuthInfo | undefined> {
  //   while (this._isAuthenticating) {
  //     await this.delay(1000);
  //   }

  //   return await Container.authManager.getAuthInfo(provider);
  // }



  // private delay(ms: number) {
  //   return new Promise(resolve => setTimeout(resolve, ms));
  // }

  private onConfigurationChanged(e: ConfigurationChangeEvent) {
    const section = "enableCharles";
    this._optionsDirty = true;

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
