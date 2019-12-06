import { getProxyHostAndPort, JiraClient, JiraCloudClient, JiraServerClient } from "jira-pi-client";
import { ConfigurationChangeEvent, Disposable, ExtensionContext } from "vscode";
import { BitbucketIssuesApiImpl } from "../bitbucket/bitbucket-cloud/bbIssues";
import { CloudPullRequestApi } from "../bitbucket/bitbucket-cloud/pullRequests";
import { CloudRepositoriesApi } from "../bitbucket/bitbucket-cloud/repositories";
import { ServerPullRequestApi } from "../bitbucket/bitbucket-server/pullRequests";
import { ServerRepositoriesApi } from "../bitbucket/bitbucket-server/repositories";
import { BitbucketApi } from "../bitbucket/model";
import { configuration } from "../config/configuration";
//import { getJiraCloudBaseUrl } from "./serverInfo";
import { cannotGetClientFor } from "../constants";
import { Container } from "../container";
import { getAgent, jiraCloudAuthProvider, jiraServerAuthProvider, jiraTransportFactory } from "../jira/jira-client/providers";
import { Logger } from "../logger";
import { PipelineApiImpl } from "../pipelines/pipelines";
import { CacheMap, Interval } from "../util/cachemap";
import { AuthInfo, DetailedSiteInfo, isBasicAuthInfo, isOAuthInfo, SiteInfo } from "./authInfo";

const oauthTTL: number = 45 * Interval.MINUTE;
const serverTTL: number = Interval.FOREVER;

export class ClientManager implements Disposable {
  private _clients: CacheMap = new CacheMap();
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

    const initializing = configuration.initializing(e);

    if (initializing
      || configuration.changed(e, 'enableCharles')
      || configuration.changed(e, 'charlesCertPath')
      || configuration.changed(e, 'charlesDebugOnly')
      || configuration.changed(e, 'enableCurlLogging')
      || configuration.changed(e, 'enableHttpsTunnel')) {
      this._agentChanged = true;
    }

    if ((initializing && Container.config.enableHttpsTunnel) || configuration.changed(e, 'enableHttpsTunnel')) {
      const [proxyHost, proxyPort] = getProxyHostAndPort();
      if (Container.config.enableHttpsTunnel) {
        Logger.debug(`setting up https tunnel to ${proxyHost}:${proxyPort}`);
      }
    }
  }

  public async bbClient(site: DetailedSiteInfo): Promise<BitbucketApi> {
    return this.getClient<BitbucketApi>(
      site,
      info => {
        let result: BitbucketApi;
        if (site.isCloud) {
          result = {
            repositories: isOAuthInfo(info)
              ? new CloudRepositoriesApi(site, info.access)
              : undefined!,
            pullrequests: isOAuthInfo(info)
              ? new CloudPullRequestApi(site, info.access)
              : undefined!,
            issues: isOAuthInfo(info)
              ? new BitbucketIssuesApiImpl(site, info.access)
              : undefined!,
            pipelines: isOAuthInfo(info)
              ? new PipelineApiImpl(site, info.access)
              : undefined!
          };
        } else {
          result = {
            repositories: isBasicAuthInfo(info)
              ? new ServerRepositoriesApi(site, info.username, info.password)
              : undefined!,
            pullrequests: isBasicAuthInfo(info)
              ? new ServerPullRequestApi(site, info.username, info.password)
              : undefined!,
            issues: undefined,
            pipelines: undefined
          };
        }

        return result;
      }
    );

  }

  public async jiraClient(site: DetailedSiteInfo): Promise<JiraClient<DetailedSiteInfo>> {
    return this.getClient<JiraClient<DetailedSiteInfo>>(
      site,
      info => {
        let client: any = undefined;

        if (isOAuthInfo(info)) {
          //client = new JiraCloudClient(info.access, site);
          client = new JiraCloudClient(site, jiraTransportFactory, jiraCloudAuthProvider(info.access), getAgent);
        } else if (isBasicAuthInfo(info)) {
          client = new JiraServerClient(site, jiraTransportFactory, jiraServerAuthProvider(info.username, info.password), getAgent);
        }

        return client;
      }
    );
  }

  private keyForSite(site: SiteInfo): string {
    const contextPath = site.contextPath ? `/${site.contextPath}` : "";
    return `${site.hostname}${contextPath}`;
  }

  private async getClient<T>(site: DetailedSiteInfo, factory: (info: AuthInfo) => any): Promise<T> {
    let client: T | undefined = this._clients.getItem<T>(this.keyForSite(site));

    if (!client) {
      try {
        await Container.credentialManager.refreshAccessToken(site);
      } catch (e) {
        Logger.debug(`error refreshing token ${e}`);
        return Promise.reject(`${cannotGetClientFor}: ${site.product.name} ... ${e}`);
      }
      const credentials = await Container.credentialManager.getAuthInfo(site);

      if (credentials) {
        client = factory(credentials);
        this._clients.setItem(this.keyForSite(site), client, isOAuthInfo(credentials) ? oauthTTL : serverTTL);
      } else {
        Logger.debug(`No credentials for ${site.name}!`);
      }
    }

    if (this._agentChanged) {
      const credentials = await Container.credentialManager.getAuthInfo(site);

      if (credentials) {
        client = factory(credentials);

        this._clients.updateItem(this.keyForSite(site), client);
      }
      this._agentChanged = false;
    }

    return client ? client : Promise.reject(new Error(`${cannotGetClientFor}: ${site.product.name}`));
  }

  // TODO: [VSCODE-598] Get rid of getValidAccessToken method
  public async getValidAccessToken(site: DetailedSiteInfo): Promise<string> {
    if (!site.isCloud) {
      return Promise.reject(`site ${site.name} is not a cloud instance`);
    }

    let client: any = this._clients.getItem(this.keyForSite(site));
    let info = await Container.credentialManager.getAuthInfo(site);
    let newAccessToken: string | undefined = undefined;

    if (isOAuthInfo(info)) {
      if (!client) {
        try {
          newAccessToken = await Container.credentialManager.refreshAccessToken(site);
        } catch (e) {
          Logger.debug(`error refreshing token ${e}`);
          return Promise.reject(e);
        }
      } else {
        newAccessToken = info.access;
      }
    }
    return newAccessToken ? newAccessToken : Promise.reject('authInfo is not a valid OAuthInfo instance');
  }

  public async removeClient(site: SiteInfo) {
    this._clients.deleteItem(this.keyForSite(site));
  }
}
