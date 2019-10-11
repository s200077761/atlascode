import {
  ConfigurationChangeEvent,
  ExtensionContext,
  Disposable,
} from "vscode";
import { JiraClient } from "../jira/jira-client/client";
import { SiteInfo, DetailedSiteInfo, AuthInfo, isOAuthInfo, isBasicAuthInfo } from "./authInfo";
import { Container } from "../container";
import { CacheMap, Interval } from "../util/cachemap";
import { configuration } from "../config/configuration";
import { Logger } from "../logger";
//import { getJiraCloudBaseUrl } from "./serverInfo";
import { cannotGetClientFor } from "../constants";
import { JiraCloudClient } from "../jira/jira-client/cloudClient";
import { JiraServerClient } from "../jira/jira-client/serverClient";
import { BitbucketApi } from "../bitbucket/model";
import { CloudPullRequestApi } from "../bitbucket/bitbucket-cloud/pullRequests";
import { CloudRepositoriesApi } from "../bitbucket/bitbucket-cloud/repositories";
import { PipelineApiImpl } from "../pipelines/pipelines";
import { ServerRepositoriesApi } from "../bitbucket/bitbucket-server/repositories";
import { ServerPullRequestApi } from "../bitbucket/bitbucket-server/pullRequests";
import { BitbucketIssuesApiImpl } from "../bitbucket/bitbucket-cloud/bbIssues";
import { getProxyHostAndPort } from "./agent";

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

  public async jiraClient(site: DetailedSiteInfo): Promise<JiraClient> {
    return this.getClient<JiraClient>(
      site,
      info => {
        let client: any = undefined;

        if (isOAuthInfo(info)) {
          client = new JiraCloudClient(info.access, site);
        } else if (isBasicAuthInfo(info)) {
          client = new JiraServerClient(info.username, info.password, site);
        }

        return client;
      }
    );
  }

  private async getClient<T>(site: DetailedSiteInfo, factory: (info: AuthInfo) => any): Promise<T> {
    let client: T | undefined = this._clients.getItem<T>(site.hostname);

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
        this._clients.setItem(site.hostname, client, isOAuthInfo(credentials) ? oauthTTL : serverTTL);
      } else {
        Logger.debug(`No credentials for ${site.name}!`);
      }
    }

    if (this._agentChanged) {
      const credentials = await Container.credentialManager.getAuthInfo(site);

      if (credentials) {
        client = factory(credentials);

        this._clients.updateItem(site.hostname, client);
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

    let client: any = this._clients.getItem(site.hostname);
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
    this._clients.deleteItem(site.hostname);
  }
}
