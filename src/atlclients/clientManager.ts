import { JiraClient, JiraCloudClient, JiraServerClient } from '@atlassianlabs/jira-pi-client';
import { getProxyHostAndPort } from '@atlassianlabs/pi-client-common/agent';
import { AxiosResponse } from 'axios';
import { ConfigurationChangeEvent, Disposable, ExtensionContext } from 'vscode';
import { BitbucketIssuesApiImpl } from '../bitbucket/bitbucket-cloud/bbIssues';
import { CloudPullRequestApi } from '../bitbucket/bitbucket-cloud/pullRequests';
import { CloudRepositoriesApi } from '../bitbucket/bitbucket-cloud/repositories';
import { ServerPullRequestApi } from '../bitbucket/bitbucket-server/pullRequests';
import { ServerRepositoriesApi } from '../bitbucket/bitbucket-server/repositories';
import { ClientError, HTTPClient } from '../bitbucket/httpClient';
import { BitbucketApi } from '../bitbucket/model';
import { configuration } from '../config/configuration';
//import { getJiraCloudBaseUrl } from "./serverInfo";
import { cannotGetClientFor } from '../constants';
import { Container } from '../container';
import {
    getAgent,
    jiraCloudAuthProvider,
    jiraServerAuthProvider,
    jiraTransportFactory
} from '../jira/jira-client/providers';
import { Logger } from '../logger';
import { PipelineApiImpl } from '../pipelines/pipelines';
import { SitesAvailableUpdateEvent } from '../siteManager';
import { CacheMap, Interval } from '../util/cachemap';
import { AuthInfo, DetailedSiteInfo, isBasicAuthInfo, isOAuthInfo } from './authInfo';

const oauthTTL: number = 45 * Interval.MINUTE;
const serverTTL: number = Interval.FOREVER;

export class ClientManager implements Disposable {
    private _clients: CacheMap = new CacheMap();
    private _agentChanged: boolean = false;

    constructor(context: ExtensionContext) {
        context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this),
            Container.siteManager.onDidSitesAvailableChange(this.onSitesDidChange, this)
        );
        this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    dispose() {
        this._clients.clear();
    }

    private onSitesDidChange(e: SitesAvailableUpdateEvent) {
        this._agentChanged = true;
    }

    // used to add and remove the proxy agent when charles setting changes.
    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (
            initializing ||
            configuration.changed(e, 'enableCharles') ||
            configuration.changed(e, 'charlesCertPath') ||
            configuration.changed(e, 'charlesDebugOnly') ||
            configuration.changed(e, 'enableCurlLogging') ||
            configuration.changed(e, 'enableHttpsTunnel')
        ) {
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
        return this.getClient<BitbucketApi>(site, info => {
            let result: BitbucketApi;
            if (site.isCloud) {
                result = {
                    repositories: isOAuthInfo(info)
                        ? new CloudRepositoriesApi(this.createOAuthHTTPClient(site, info.access))
                        : undefined!,
                    pullrequests: isOAuthInfo(info)
                        ? new CloudPullRequestApi(this.createOAuthHTTPClient(site, info.access))
                        : undefined!,
                    issues: isOAuthInfo(info)
                        ? new BitbucketIssuesApiImpl(this.createOAuthHTTPClient(site, info.access))
                        : undefined!,
                    pipelines: isOAuthInfo(info)
                        ? new PipelineApiImpl(this.createOAuthHTTPClient(site, info.access))
                        : undefined!
                };
            } else {
                result = {
                    repositories: isBasicAuthInfo(info)
                        ? new ServerRepositoriesApi(this.createBasicHTTPClient(site, info.username, info.password))
                        : undefined!,
                    pullrequests: isBasicAuthInfo(info)
                        ? new ServerPullRequestApi(this.createBasicHTTPClient(site, info.username, info.password))
                        : undefined!,
                    issues: undefined,
                    pipelines: undefined
                };
            }

            return result;
        });
    }

    public async jiraClient(site: DetailedSiteInfo): Promise<JiraClient<DetailedSiteInfo>> {
        return this.getClient<JiraClient<DetailedSiteInfo>>(site, info => {
            let client: any = undefined;

            if (isOAuthInfo(info)) {
                client = new JiraCloudClient(site, jiraTransportFactory, jiraCloudAuthProvider(info.access), getAgent);
            } else if (isBasicAuthInfo(info)) {
                client = new JiraServerClient(
                    site,
                    jiraTransportFactory,
                    jiraServerAuthProvider(info.username, info.password),
                    getAgent
                );
            }

            return client;
        });
    }

    private createOAuthHTTPClient(site: DetailedSiteInfo, token: string): HTTPClient {
        return new HTTPClient(
            site.baseApiUrl,
            `Bearer ${token}`,
            getAgent(site),
            async (response: AxiosResponse): Promise<Error> => {
                let errString = 'Unknown error';
                const errJson = response.data;

                if (errJson.error && errJson.error.message) {
                    errString = errJson.error.message;
                } else {
                    errString = errJson;
                }

                return new ClientError(response.statusText, errString);
            }
        );
    }

    private createBasicHTTPClient(site: DetailedSiteInfo, username: string, password: string): HTTPClient {
        return new HTTPClient(
            site.baseApiUrl,
            `Basic ${Buffer.from(username + ':' + password).toString('base64')}`,
            getAgent(site),
            async (response: AxiosResponse): Promise<Error> => {
                let errString = 'Unknown error';
                const errJson = await response.data;

                if (errJson.errors && Array.isArray(errJson.errors) && errJson.errors.length > 0) {
                    const e = errJson.errors[0];
                    errString = e.message || errString;
                } else {
                    errString = errJson;
                }

                return new ClientError(response.statusText, errString);
            }
        );
    }

    private keyForSite(site: DetailedSiteInfo): string {
        return site.credentialId;
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

    public async removeClient(site: DetailedSiteInfo) {
        this._clients.deleteItem(this.keyForSite(site));
    }
}
