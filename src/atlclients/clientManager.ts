import {
  window,
  ConfigurationChangeEvent,
  ExtensionContext,
  Disposable,
} from "vscode";
import * as BitbucketKit from "bitbucket";
import * as JiraKit from "@atlassian/jira";
import { OAuthProvider, AccessibleResource, SiteInfo, oauthProviderForSite, OAuthInfo, DetailedSiteInfo, Product, ProductBitbucket, ProductJira, AuthInfo, isOAuthInfo, isBasicAuthInfo, isAppAuthInfo } from "./authInfo";
import { Container } from "../container";
import { OAuthDancer } from "./oauthDancer";
import { CacheMap, Interval } from "../util/cachemap";
var tunnel = require("tunnel");
import * as fs from "fs";
import { configuration } from "../config/configuration";
import { Resources } from "../resources";
import { authenticatedEvent } from "../analytics";
import { Logger } from "../logger";
import { getJiraCloudBaseUrl } from "./serverInfo";
import { cannotGetClientFor } from "../constants";

const oauthTTL: number = 45 * Interval.MINUTE;
const serverTTL: number = Interval.FOREVER;

export class ClientManager implements Disposable {
  private _clients: CacheMap = new CacheMap();
  private _dancer: OAuthDancer = new OAuthDancer();
  private _agent: any | undefined;
  private _agentChanged: boolean = false;

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

    const initializing = configuration.initializing(e);

    if (initializing || configuration.changed(e, section)) {
      this._agentChanged = true;

      try {
        if (Container.isDebugging && configuration.get<boolean>(section)) {
          let pemFile = fs.readFileSync(Resources.charlesCert);

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
  public async userInitiatedOAuthLogin(site: SiteInfo): Promise<void> {
    const provider = oauthProviderForSite(site);
    try {
      if (!provider) {
        throw new Error(`No provider found for ${site.hostname}`);
      }

      const resp = await this._dancer.doDance(provider);

      const oauthInfo: OAuthInfo = {
        access: resp.access,
        refresh: resp.refresh,
        provider: provider,
        user: resp.user
      };

      const siteDetails: DetailedSiteInfo | undefined = await this.getNewOAuthSiteDetails(site.product, oauthInfo, resp.accessibleResources);

      if (siteDetails) {
        await Container.authManager.saveAuthInfo(siteDetails, oauthInfo);
      }

      window.showInformationMessage(`You are now authenticated with ${site.product}`);
      authenticatedEvent(site.product.name).then(e => { Container.analyticsClient.sendTrackEvent(e); });
    } catch (e) {
      Logger.error(e, 'Error authenticating');
      if (typeof e === 'object' && e.cancelled !== undefined) {
        window.showWarningMessage(`${e.message}`);
      } else {
        window.showErrorMessage(`There was an error authenticating with provider '${provider}': ${e}`);
      }

    }
  }

  private async getNewOAuthSiteDetails(product: Product, authInfo: OAuthInfo, resources: AccessibleResource[]): Promise<DetailedSiteInfo | undefined> {
    const knownSites = Container.siteManager.getSitesAvailable(product);
    let newResource: AccessibleResource | undefined = undefined;
    let newSite: DetailedSiteInfo | undefined = undefined;

    switch (product.key) {
      case ProductBitbucket.key:
        const bbResources = resources.filter(resource => knownSites.find(site => site.hostname.endsWith(resource.baseUrlSuffix) === undefined));
        if (bbResources.length > 0) {
          newResource = bbResources[0];
          const hostname = (authInfo.provider === OAuthProvider.BitbucketCloud) ? 'bitbucket.org' : 'staging.bb-inf.net';
          const baseApiUrl = (authInfo.provider === OAuthProvider.BitbucketCloud) ? 'api.bitbucket.org/2.0' : 'api-staging.bb-inf.net/2.0';
          const siteName = (authInfo.provider === OAuthProvider.BitbucketCloud) ? 'Bitbucket Cloud' : 'Bitbucket Staging Cloud';

          // TODO: [VSCODE-496] find a way to embed and link to a bitbucket icon
          newSite = {
            avatarUrl: "",
            baseApiUrl: baseApiUrl,
            baseLinkUrl: `https://${hostname}`,
            hostname: hostname,
            id: newResource.id,
            name: siteName,
            product: ProductBitbucket,
            isCloud: true,
          };
        }
        break;
      case ProductJira.key:
        const jiraResources = resources.filter(resource => knownSites.find(site => site.id === resource.id) === undefined);
        if (jiraResources.length > 0) {
          newResource = jiraResources[0];

          let apiUri = authInfo.provider === OAuthProvider.JiraCloudStaging ? "api.stg.atlassian.com" : "api.atlassian.com";
          const baseUrlString = await getJiraCloudBaseUrl(`https://${apiUri}/ex/jira/${newResource.id}/rest/2`, authInfo.access);
          const baseUrl: URL = new URL(baseUrlString);

          newSite = {
            avatarUrl: newResource.avatarUrl,
            baseApiUrl: `https://${apiUri}/ex/jira/${newResource.id}/rest/2`,
            baseLinkUrl: baseUrlString,
            hostname: baseUrl.hostname,
            id: newResource.id,
            name: newResource.name,
            product: ProductJira,
            isCloud: true,
          };
        }
        break;
    }

    return newSite;
  }

  public async bbrequest(site: DetailedSiteInfo): Promise<BitbucketKit> {

    return this.getClient<BitbucketKit>(
      site,
      info => {
        let extraOptions = {};
        if (this._agent) {
          extraOptions = { agent: this._agent };
        }

        let bbclient = new BitbucketKit({ baseUrl: site.baseApiUrl, options: extraOptions });

        if (isOAuthInfo(info)) {
          bbclient.authenticate({ type: "token", token: info.access });
        }

        if (isBasicAuthInfo(info)) {
          bbclient.authenticate({ type: "basic", username: info.username, password: info.password });
        }

        if (isAppAuthInfo(info)) {
          bbclient.authenticate({ type: "basic", username: info.username, password: info.token });
        }

        return bbclient;
      }
    );

  }

  public async jirarequest(site: DetailedSiteInfo): Promise<JiraKit> {
    return this.getClient<JiraKit>(
      site,
      info => {
        let extraOptions = {};
        if (this._agent) {
          extraOptions = { agent: this._agent };
        }

        const client = new JiraKit({ baseUrl: site.baseApiUrl, options: extraOptions });

        if (isOAuthInfo(info)) {
          client.authenticate({ type: "token", token: info.access });
        }

        if (isBasicAuthInfo(info)) {
          client.authenticate({ type: "basic", username: info.username, password: info.password });
        }

        if (isAppAuthInfo(info)) {
          client.authenticate({ type: "basic", username: info.username, password: info.token });
        }

        return client;
      }
    );
  }

  private async getClient<T>(site: DetailedSiteInfo, factory: (info: AuthInfo) => any): Promise<T> {
    let client: T | undefined = this._clients.getItem<T>(site.hostname);

    if (!client) {
      const info = await Container.authManager.getAuthInfo(site);

      if (isOAuthInfo(info)) {
        try {
          const provider: OAuthProvider | undefined = oauthProviderForSite(site);
          if (provider) {
            const newAccessToken = await this._dancer.getNewAccessToken(provider, info.refresh);
            if (newAccessToken) {
              info.access = newAccessToken;
              await Container.authManager.saveAuthInfo(site, info);

              client = factory(info);
              this._clients.setItem(site.hostname, client, oauthTTL);
            }
          }
        } catch (e) {
          Logger.debug(`error refreshing token ${e}`);
          return Promise.reject(new Error(`${cannotGetClientFor}: ${site.product.name}`));
        }
      } else if (info) {
        client = factory(info);
        this._clients.setItem(site.hostname, client, serverTTL);
      }
    }

    if (this._agentChanged) {
      let info = await Container.authManager.getAuthInfo(site);

      if (info) {
        client = factory(info);
        this._clients.updateItem(site.hostname, client);
      }
      this._agentChanged = false;
    }

    return client ? client : Promise.reject(new Error(`${cannotGetClientFor}: ${site.product.name}`));
  }

  public async getValidAccessToken(site: DetailedSiteInfo): Promise<string> {
    if (!site.isCloud) {
      return Promise.reject(`site ${site.name} is not a cloud instance`);
    }

    let client: any = this._clients.getItem(site.hostname);
    let info = await Container.authManager.getAuthInfo(site);
    let newAccessToken: string | undefined = undefined;

    if (isOAuthInfo(info)) {
      if (!client) {
        try {
          const provider: OAuthProvider | undefined = oauthProviderForSite(site);
          if (provider) {
            newAccessToken = await this._dancer.getNewAccessToken(provider, info.refresh);
            if (newAccessToken) {
              info.access = newAccessToken;
              await Container.authManager.saveAuthInfo(site, info);
            }
          }
        } catch (e) {
          Logger.debug(`error refreshing token ${e}`);
          return Promise.reject(e);
        }
      } else if (info) {
        newAccessToken = info.access;
      }
    }
    return newAccessToken ? newAccessToken : Promise.reject('authInfo is not a valid OAuthInfo instance');
  }

  public async removeClient(site: SiteInfo) {
    this._clients.deleteItem(site.hostname);
  }

}
