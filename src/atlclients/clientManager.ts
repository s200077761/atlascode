import {
  window,
  ConfigurationChangeEvent,
  ExtensionContext,
  Disposable,
} from "vscode";
import * as BitbucketKit from "bitbucket";
import * as JiraKit from "@atlassian/jira";
import { AuthProvider, AuthInfo, productForProvider, AccessibleResource } from "./authInfo";
import { Container } from "../container";
import { OAuthDancer } from "./oauthDancer";
import { CacheMap, Interval } from "../util/cachemap";
var tunnel = require("tunnel");
import * as fs from "fs";
import { configuration, isEmptySite, isStagingSite } from "../config/configuration";
import { Resources } from "../resources";
import { authenticatedEvent } from "../analytics";
import { Logger } from "../logger";

export class ClientManager implements Disposable {
  private _clients: CacheMap = new CacheMap();
  private _dancer: OAuthDancer = new OAuthDancer();
  private _agent: any | undefined;

  constructor(context: ExtensionContext) {
    context.subscriptions.push(
      configuration.onDidChange(this.onConfigurationChanged, this)
    );
    this.onConfigurationChanged(configuration.initializingChangeEvent);
  }

  dispose() {
    this._clients.clear();

  }

  // used to add and remove the proxy agent when charles setting changes.
  private onConfigurationChanged(e: ConfigurationChangeEvent) {
    const section = "enableCharles";

    if (e.affectsConfiguration(section)) {
      try {
        let pemFile = fs.readFileSync(Resources.charlesCert);

        if (Container.isDebugging && configuration.get<boolean>(section)) {
          this._agent = tunnel.httpsOverHttp({
            ca: [pemFile],
            proxy: {
              host: "127.0.0.1",
              port: 8888
            }
          });
        } else {
          this._agent = undefined;
        }

        this._clients.clear();

      } catch (err) {
        this._agent = undefined;
      }
    }
  }

  // this is *only* called when login buttons are clicked by the user
  public async userInitiatedLogin(provider: string): Promise<void> {

    try {
      this._dancer.doDance(provider)
        .then(info => {
          Container.authManager.saveAuthInfo(info.user.provider, info)
            .then(() => {
              const product = productForProvider(info.user.provider);
              window.showInformationMessage(`You are now authenticated with ${product}`);
              authenticatedEvent(product).then(e => { Container.analyticsClient.sendTrackEvent(e); });

            });
        },
          reason => {
            Logger.error(reason, 'Error authenticating');
            window.showErrorMessage(`There was an error authenticating with provider '${provider}': ${reason}`);
          }
        );
    } catch (e) {
      Logger.error(e, 'Error authenticating');
      window.showErrorMessage(`There was an error authenticating with provider '${provider}'`);
    }
  }

  public async bbrequest(): Promise<BitbucketKit | undefined> {
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
      }, false
    );
  }

  public async bbrequestStaging(): Promise<BitbucketKit | undefined> {
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
      }, false
    );
  }

  public async jirarequest(workingSite?: AccessibleResource): Promise<JiraKit | undefined> {
    // if workingSite is passed in and is different from the one in config, 
    // it is for a one-off request (eg. a request from webview from previously configured workingSite)
    const useEphemeralClient = workingSite && workingSite.id !== Container.config.jira.workingSite.id;

    if (!workingSite || isEmptySite(workingSite)) {
      workingSite = Container.config.jira.workingSite;
    }

    let provider = (workingSite && isStagingSite(workingSite)) ? AuthProvider.JiraCloudStaging : AuthProvider.JiraCloud;
    let apiUri = (workingSite && isStagingSite(workingSite)) ? "api.stg.atlassian.com" : "api.atlassian.com";

    return this.getClient<JiraKit>(provider, info => {
      let cloudId: string = "";

      if (Array.isArray(info.accessibleResources) && info.accessibleResources.length > 0) {
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

      // if (!cloudId || cloudId.length < 4) {
      //   return undefined;
      // }

      let extraOptions = {};
      if (this._agent) {
        extraOptions = { agent: this._agent };
      }

      let jraclient = new JiraKit({
        baseUrl: `https://${apiUri}/ex/jira/${cloudId}/rest/`,
        options: extraOptions,
        headers: { "x-atlassian-force-account-id": "true" }
      });
      jraclient.authenticate({ type: "token", token: info.access });

      return jraclient;
    }, useEphemeralClient);
  }

  private async getClient<T>(
    provider: string,
    factory: (info: AuthInfo) => any,
    useEphemeralClient: boolean = true
  ): Promise<T | undefined> {

    let client = undefined;

    if (useEphemeralClient) {
      let info = await Container.authManager.getAuthInfo(provider);
      if (info) {
        client = factory(info);
      }
    } else {
      client = await this._clients.getItem<T>(provider);
    }

    if (!client) {
      let info = await Container.authManager.getAuthInfo(provider);

      if (!info) {
        return undefined;
      }
      else {
        try {
          let newInfo = await this._dancer.refresh(info);
          info = newInfo;
          await Container.authManager.saveAuthInfo(provider, info);
        } catch (e) {
          Logger.debug(`error refreshing token ${e}`);
          return undefined;
        }
      }

      client = factory(info);

      await this._clients.setItem(provider, client, 45 * Interval.MINUTE);
    }

    return client;
  }

  public async removeClient(provider: string) {
    this._clients.deleteItem(provider);
  }

}
