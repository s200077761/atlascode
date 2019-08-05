import {
  window,
  ConfigurationChangeEvent,
  ExtensionContext,
  Disposable,
} from "vscode";
import { JiraClient } from "../jira/jira-client/client";
import { OAuthProvider, SiteInfo, oauthProviderForSite, OAuthInfo, DetailedSiteInfo, Product, ProductBitbucket, ProductJira, AuthInfo, isOAuthInfo, isBasicAuthInfo, AccessibleResource } from "./authInfo";
import { Container } from "../container";
import { OAuthDancer } from "./oauthDancer";
import { CacheMap, Interval } from "../util/cachemap";
var tunnel = require("tunnel");
import * as fs from "fs";
import { configuration } from "../config/configuration";
import { Resources } from "../resources";
import { authenticatedEvent } from "../analytics";
import { Logger } from "../logger";
//import { getJiraCloudBaseUrl } from "./serverInfo";
import { cannotGetClientFor } from "../constants";
import fetch from 'node-fetch';
import { OAuthRefesher } from "./oauthRefresher";
import { JiraCloudClient } from "../jira/jira-client/cloudClient";
import { JiraServerClient } from "../jira/jira-client/serverClient";
import { BitbucketApi } from "../bitbucket/model";
import { CloudPullRequestApi } from "../bitbucket/bitbucket-cloud/pullRequests";
import { CloudRepositoriesApi } from "../bitbucket/bitbucket-cloud/repositories";
import { PipelineApiImpl } from "../pipelines/pipelines";
import { ServerRepositoriesApi } from "../bitbucket/bitbucket-server/repositories";
import { ServerPullRequestApi } from "../bitbucket/bitbucket-server/pullRequests";
import { BitbucketIssuesApiImpl } from "../bitbucket/bitbucket-cloud/bbIssues";

const oauthTTL: number = 45 * Interval.MINUTE;
const serverTTL: number = Interval.FOREVER;

export class ClientManager implements Disposable {
  private _clients: CacheMap = new CacheMap();
  private _dancer: OAuthDancer = OAuthDancer.Instance;
  private _refresher: OAuthRefesher = new OAuthRefesher();
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
    this._dancer.dispose();
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

  public async userInitiatedServerLogin(site: SiteInfo, authInfo: AuthInfo): Promise<void> {
    let siteDetails: DetailedSiteInfo | undefined = undefined;

    switch (site.product.key) {
      case ProductJira.key:
        if (isBasicAuthInfo(authInfo)) {
          let authHeader = 'Basic ' + new Buffer(authInfo.username + ':' + authInfo.password).toString('base64');
          try {
            const res = await fetch(`https://${site.hostname}/rest/api/2/myself`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader
              }
            });
            const json = await res.json();

            siteDetails = {
              product: site.product,
              isCloud: false,
              avatarUrl: `https://${site.hostname}/images/fav-jcore.png`,
              hostname: site.hostname,
              baseApiUrl: `https://${site.hostname}/rest`,
              baseLinkUrl: `https://${site.hostname}`,
              id: site.hostname,
              name: site.hostname
            };

            authInfo.user = {
              displayName: json.displayName,
              id: json.key
            };

            await Container.authManager.saveAuthInfo(siteDetails, authInfo);

          } catch (err) {
            Logger.error(new Error(`Error authenticating with Jira: ${err}`));
            return Promise.reject(`Error authenticating with Jira: ${err}`);
          }
        }
        break;

      case ProductBitbucket.key:
        let authHeader = "";
        if (isBasicAuthInfo(authInfo)) {
          authHeader = 'Basic ' + new Buffer(authInfo.username + ':' + authInfo.password).toString('base64');


          try {
            const res = await fetch(`https://${site.hostname}/rest/api/1.0/users/${authInfo.username}`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader
              }
            });
            const json = await res.json();

            siteDetails = {
              product: site.product,
              isCloud: false,
              avatarUrl: ``,
              hostname: site.hostname,
              baseApiUrl: `https://${site.hostname}`,
              baseLinkUrl: `https://${site.hostname}`,
              id: site.hostname,
              name: site.hostname
            };

            authInfo.user = {
              displayName: json.displayName,
              id: json.slug
            };

            await Container.authManager.saveAuthInfo(siteDetails, authInfo);

          } catch (err) {
            Logger.error(new Error(`Error authenticating with Bitbucket: ${err}`));
            return Promise.reject(`Error authenticating with Bitbucket: ${err}`);
          }
        }
        break;
    }
  }

  private async getNewOAuthSiteDetails(product: Product, authInfo: OAuthInfo, resources: AccessibleResource[]): Promise<DetailedSiteInfo | undefined> {
    const knownSites = Container.siteManager.getSitesAvailable(product);
    let newResource: AccessibleResource | undefined = undefined;
    let newSite: DetailedSiteInfo | undefined = undefined;

    switch (product.key) {
      case ProductBitbucket.key:
        const bbResources = resources.filter(resource => knownSites.find(site => resource.url.endsWith(site.hostname) === undefined));
        if (bbResources.length > 0) {
          newResource = bbResources[0];
          const hostname = (authInfo.provider === OAuthProvider.BitbucketCloud) ? 'bitbucket.org' : 'staging.bb-inf.net';
          const baseApiUrl = (authInfo.provider === OAuthProvider.BitbucketCloud) ? 'https://api.bitbucket.org/2.0' : 'https://api-staging.bb-inf.net/2.0';
          const siteName = (authInfo.provider === OAuthProvider.BitbucketCloud) ? 'Bitbucket Cloud' : 'Bitbucket Staging Cloud';

          // TODO: [VSCODE-496] find a way to embed and link to a bitbucket icon
          newSite = {
            avatarUrl: "",
            baseApiUrl: baseApiUrl,
            baseLinkUrl: newResource.url,
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

          //TODO: [VSCODE-505] call serverInfo endpoint when it supports OAuth
          //const baseUrlString = await getJiraCloudBaseUrl(`https://${apiUri}/ex/jira/${newResource.id}/rest/2`, authInfo.access);
          const baseUrlString = newResource.url;
          const baseUrl: URL = new URL(baseUrlString);

          newSite = {
            avatarUrl: newResource.avatarUrl,
            baseApiUrl: `https://${apiUri}/ex/jira/${newResource.id}/rest`,
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

  public async bbrequest(site: DetailedSiteInfo): Promise<BitbucketApi> {

    return this.getClient<BitbucketApi>(
      site,
      info => {
        let result: BitbucketApi;
        if (site.isCloud) {
          result = {
            repositories: isOAuthInfo(info)
              ? new CloudRepositoriesApi(site, info.access, this._agent)
              : undefined!,
            pullrequests: isOAuthInfo(info)
              ? new CloudPullRequestApi(site, info.access, this._agent)
              : undefined!,
            issues: isOAuthInfo(info)
              ? new BitbucketIssuesApiImpl(site, info.access, this._agent)
              : undefined!,
            pipelines: isOAuthInfo(info)
              ? new PipelineApiImpl(site, info.access, this._agent)
              : undefined!
          };
        } else {
          result = {
            repositories: isBasicAuthInfo(info)
              ? new ServerRepositoriesApi(site, info.username, info.password, this._agent)
              : undefined!,
            pullrequests: isBasicAuthInfo(info)
              ? new ServerPullRequestApi(site, info.username, info.password, this._agent)
              : undefined!,
            issues: undefined,
            pipelines: undefined
          };
        }

        return result;
      }
    );

  }

  public async jirarequest(site: DetailedSiteInfo): Promise<JiraClient> {
    return this.getClient<JiraClient>(
      site,
      info => {
        let client: any = undefined;

        if (isOAuthInfo(info)) {
          client = new JiraCloudClient(info.access, site, this._agent);
        } else if (isBasicAuthInfo(info)) {
          client = new JiraServerClient(info.username, info.password, site, this._agent);
        }

        return client;
      }
    );
  }

  private async getClient<T>(site: DetailedSiteInfo, factory: (info: AuthInfo) => any): Promise<T> {
    let client: T | undefined = this._clients.getItem<T>(site.hostname);

    if (!client) {
      Logger.debug('trying to build new client', site);
      const info = await Container.authManager.getAuthInfo(site);

      Logger.debug('got authInfo', info);

      if (isOAuthInfo(info)) {
        try {
          const provider: OAuthProvider | undefined = oauthProviderForSite(site);
          Logger.debug('got authProvider', provider);
          if (provider) {
            const newAccessToken = await this._refresher.getNewAccessToken(provider, info.refresh);
            Logger.debug('got newAccessToken', newAccessToken);
            if (newAccessToken) {
              info.access = newAccessToken;
              await Container.authManager.saveAuthInfo(site, info);

              client = factory(info);

              Logger.debug('got new client', client);
              this._clients.setItem(site.hostname, client, oauthTTL);
            }
          }
        } catch (e) {
          Logger.debug(`error refreshing token ${e}`);
          return Promise.reject(`${cannotGetClientFor}: ${site.product.name} ... ${e}`);
        }
      } else if (info) {
        client = factory(info);
        this._clients.setItem(site.hostname, client, serverTTL);
      }
    }

    if (this._agentChanged) {
      Logger.debug('agent changed, getting authInfo');
      let info = await Container.authManager.getAuthInfo(site);
      Logger.debug('got authInfo', info);

      if (info) {
        client = factory(info);
        Logger.debug('got new client', client);

        this._clients.updateItem(site.hostname, client);
      }
      this._agentChanged = false;
    }

    Logger.debug('got client?', client);
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
            newAccessToken = await this._refresher.getNewAccessToken(provider, info.refresh);
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
