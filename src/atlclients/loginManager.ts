import axios, { AxiosInstance } from 'axios';
import { v4 } from 'uuid';
import * as vscode from 'vscode';
import { authenticatedEvent, editedEvent } from '../analytics';
import { AnalyticsClient } from '../analytics-node-client/src';
import { configuration } from '../config/configuration';
import { AxiosUserAgent } from '../constants';
import { getAgent, getAxiosInstance } from '../jira/jira-client/providers';
import { Logger } from '../logger';
import { SiteManager } from '../siteManager';
import { ConnectionTimeout } from '../util/time';
import {
    AccessibleResource,
    AuthInfo,
    BasicAuthInfo,
    DetailedSiteInfo,
    isBasicAuthInfo,
    OAuthInfo,
    OAuthProvider,
    oauthProviderForSite,
    OAuthResponse,
    Product,
    ProductBitbucket,
    ProductJira,
    SiteInfo,
} from './authInfo';
import { CredentialManager } from './authStore';
import { BitbucketAuthenticator } from './bitbucketAuthenticator';
import { JiraAuthentictor as JiraAuthenticator } from './jiraAuthenticator';
import { OAuthDancer } from './oauthDancer';

const slugRegex = /[\[\:\/\?#@\!\$&'\(\)\*\+,;\=%\\\[\]]/gi;

export class LoginManager {
    private _dancer: OAuthDancer = OAuthDancer.Instance;
    private _activeRequests: Map<string, SiteInfo> = new Map();
    private _axios: AxiosInstance;
    private _jiraAuthenticator: JiraAuthenticator;
    private _bitbucketAuthenticator: BitbucketAuthenticator;

    constructor(
        private _credentialManager: CredentialManager,
        private _siteManager: SiteManager,
        private _analyticsClient: AnalyticsClient
    ) {
        this._axios = axios.create({
            timeout: ConnectionTimeout,
            headers: {
                'User-Agent': AxiosUserAgent,
                'Accept-Encoding': 'gzip, deflate',
            },
        });
        this._bitbucketAuthenticator = new BitbucketAuthenticator(this._axios);
        this._jiraAuthenticator = new JiraAuthenticator(this._axios);
    }

    // this is *only* called when login buttons are clicked by the user
    public async userInitiatedOAuthLogin(site: SiteInfo, callback: string): Promise<void> {
        if (configuration.get<boolean>('useNewAuth')) {
            const callableUri = await vscode.env.asExternalUri(
                vscode.Uri.parse(`${vscode.env.uriScheme}://atlassian.atlascode/finalizeAuthentication`)
            );
            const rawState = `${v4()}::${callableUri}`;
            const state = new Buffer(rawState).toString('base64');
            this._activeRequests.set(state, site);
            if (site.product.key === ProductJira.key) {
                this._jiraAuthenticator.startAuthentication(state, site);
            } else {
                this._bitbucketAuthenticator.startAuthentication(state, site);
            }

            return Promise.resolve();
        } else {
            const provider = oauthProviderForSite(site)!;
            if (!provider) {
                throw new Error(`No provider found for ${site.host}`);
            }

            const resp = await this._dancer.doDance(provider, site, callback);
            this.saveDetails(site, resp);
        }
    }

    // We get here via the app url
    public async exchangeCodeForTokens(state: string, code: string) {
        const site = this._activeRequests.get(state);
        if (site) {
            try {
                const provider = oauthProviderForSite(site)!;
                const agent = getAgent(site);

                if (site.product.key === ProductJira.key) {
                    const oauthResponse = await this._jiraAuthenticator.exchangeCode(provider, state, code, agent);
                    this.saveDetails(site, oauthResponse);
                } else {
                    const oauthResponse = await this._bitbucketAuthenticator.exchangeCode(provider, state, code, agent);
                    this.saveDetails(site, oauthResponse);
                }
            } catch (err) {}
        }
    }

    private async saveDetails(site: SiteInfo, resp: OAuthResponse) {
        const provider = oauthProviderForSite(site);
        try {
            if (!provider) {
                throw new Error(`No provider found for ${site.host}`);
            }

            const oauthInfo: OAuthInfo = {
                access: resp.access,
                refresh: resp.refresh,
                user: resp.user,
            };

            const siteDetails = await this.getOAuthSiteDetails(
                site.product,
                provider,
                resp.user.id,
                resp.accessibleResources
            );

            siteDetails.forEach(async (siteInfo) => {
                await this._credentialManager.saveAuthInfo(siteInfo, oauthInfo);
                this._siteManager.addSites([siteInfo]);
                authenticatedEvent(siteInfo).then((e) => {
                    this._analyticsClient.sendTrackEvent(e);
                });
            });
        } catch (e) {
            Logger.error(e, 'Error authenticating');
            // if (typeof e === 'object' && e.cancelled !== undefined) {
            //     window.showWarningMessage(`${e.message}`);
            // } else {
            //     window.showErrorMessage(`There was an error authenticating with provider '${provider}': ${e}`);
            // }
        }
    }

    private async getOAuthSiteDetails(
        product: Product,
        provider: OAuthProvider,
        userId: string,
        resources: AccessibleResource[]
    ): Promise<DetailedSiteInfo[]> {
        switch (product.key) {
            case ProductBitbucket.key:
                return this._bitbucketAuthenticator.getOAuthSiteDetails(provider, userId, resources);
            case ProductJira.key:
                return this._jiraAuthenticator.getOAuthSiteDetails(provider, userId, resources);
        }

        return [];
    }

    public async userInitiatedServerLogin(site: SiteInfo, authInfo: AuthInfo): Promise<void> {
        if (isBasicAuthInfo(authInfo)) {
            try {
                const siteDetails = await this.saveDetailsForServerSite(site, authInfo);
                authenticatedEvent(siteDetails).then((e) => {
                    this._analyticsClient.sendTrackEvent(e);
                });
            } catch (err) {
                const errorString = `Error authenticating with ${site.product.name}: ${err}`;
                Logger.error(new Error(errorString));
                return Promise.reject(errorString);
            }
        }
    }

    public async updatedServerInfo(site: SiteInfo, authInfo: AuthInfo): Promise<void> {
        if (isBasicAuthInfo(authInfo)) {
            try {
                const siteDetails = await this.saveDetailsForServerSite(site, authInfo);
                editedEvent(siteDetails).then((e) => {
                    this._analyticsClient.sendTrackEvent(e);
                });
            } catch (err) {
                const errorString = `Error authenticating with ${site.product.name}: ${err}`;
                Logger.error(new Error(errorString));
                return Promise.reject(errorString);
            }
        }
    }

    private async saveDetailsForServerSite(site: SiteInfo, credentials: BasicAuthInfo): Promise<DetailedSiteInfo> {
        const authHeader = 'Basic ' + new Buffer(credentials.username + ':' + credentials.password).toString('base64');
        // For cloud instances we can use the user ID as the credential ID (they're globally unique). Server instances will
        // have a much smaller pool of user IDs so we use an arbitrary UUID as the credential ID.

        let siteDetailsUrl = '';
        let avatarUrl = '';
        let apiUrl = '';
        const protocol = site.protocol ? site.protocol : 'https:';
        const contextPath = site.contextPath ? site.contextPath : '';
        switch (site.product.key) {
            case ProductJira.key:
                siteDetailsUrl = `${protocol}//${site.host}${contextPath}/rest/api/2/myself`;
                avatarUrl = `${protocol}//${site.host}${contextPath}/images/fav-jcore.png`;
                apiUrl = `${protocol}//${site.host}${contextPath}/rest`;
                break;
            case ProductBitbucket.key:
                siteDetailsUrl = `${protocol}//${
                    site.host
                }${contextPath}/rest/api/1.0/users/${credentials.username.replace(slugRegex, '_')}?avatarSize=64`;
                avatarUrl = '';
                apiUrl = `${protocol}//${site.host}${contextPath}`;
                break;
        }

        const transport = getAxiosInstance();

        const res = await transport(siteDetailsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader,
            },
            ...getAgent(site),
        });
        const json = res.data;

        const userId = site.product.key === ProductJira.key ? json.name : json.slug;
        const baseLinkUrl = `${site.host}${contextPath}`;
        const credentialId = CredentialManager.generateCredentialId(baseLinkUrl, credentials.username);

        const siteDetails = {
            product: site.product,
            isCloud: false,
            avatarUrl: avatarUrl,
            host: site.host,
            baseApiUrl: apiUrl,
            baseLinkUrl: `${protocol}//${baseLinkUrl}`,
            contextPath: contextPath,
            id: site.host,
            name: site.host,
            userId: userId,
            credentialId: credentialId,
            customSSLCertPaths: site.customSSLCertPaths,
            pfxPath: site.pfxPath,
            pfxPassphrase: site.pfxPassphrase,
        };

        if (site.product.key === ProductJira.key) {
            credentials.user = {
                displayName: json.displayName,
                id: userId,
                email: json.emailAddress,
                avatarUrl: json.avatarUrls['48x48'],
            };
        } else {
            credentials.user = {
                displayName: json.displayName,
                id: userId,
                email: json.emailAddress,
                avatarUrl: json.avatarUrl,
            };
        }

        await this._credentialManager.saveAuthInfo(siteDetails, credentials);
        this._siteManager.addOrUpdateSite(siteDetails);

        return siteDetails;
    }
}
