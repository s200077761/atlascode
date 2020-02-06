import { window } from 'vscode';
import { authenticatedEvent, editedEvent } from '../analytics';
import { AnalyticsClient } from '../analytics-node-client/src';
import { getAgent, getAxiosInstance } from '../jira/jira-client/providers';
import { Logger } from '../logger';
import { SiteManager } from '../siteManager';
import {
    AccessibleResource,
    AuthInfo,
    BasicAuthInfo,
    DetailedSiteInfo,
    isBasicAuthInfo,
    OAuthInfo,
    OAuthProvider,
    oauthProviderForSite,
    Product,
    ProductBitbucket,
    ProductJira,
    SiteInfo
} from './authInfo';
import { CredentialManager } from './authStore';
import { OAuthDancer } from './oauthDancer';

const slugRegex = /[\[\:\/\?#@\!\$&'\(\)\*\+,;\=%\\\[\]]/gi;
export class LoginManager {
    private _dancer: OAuthDancer = OAuthDancer.Instance;

    constructor(
        private _credentialManager: CredentialManager,
        private _siteManager: SiteManager,
        private _analyticsClient: AnalyticsClient
    ) {}

    // this is *only* called when login buttons are clicked by the user
    public async userInitiatedOAuthLogin(site: SiteInfo, callback: string): Promise<void> {
        const provider = oauthProviderForSite(site);
        try {
            if (!provider) {
                throw new Error(`No provider found for ${site.host}`);
            }

            const resp = await this._dancer.doDance(provider, site, callback);

            const oauthInfo: OAuthInfo = {
                access: resp.access,
                refresh: resp.refresh,
                user: resp.user
            };

            const siteDetails = await this.getOAuthSiteDetails(
                site.product,
                provider,
                resp.user.id,
                resp.accessibleResources
            );

            siteDetails.forEach(async siteInfo => {
                await this._credentialManager.saveAuthInfo(siteInfo, oauthInfo);
                this._siteManager.addSites([siteInfo]);
                authenticatedEvent(siteInfo).then(e => {
                    this._analyticsClient.sendTrackEvent(e);
                });
            });

            window.showInformationMessage(`You are now authenticated with ${site.product.name}`);
        } catch (e) {
            Logger.error(e, 'Error authenticating');
            if (typeof e === 'object' && e.cancelled !== undefined) {
                window.showWarningMessage(`${e.message}`);
            } else {
                window.showErrorMessage(`There was an error authenticating with provider '${provider}': ${e}`);
            }
        }
    }

    private async getOAuthSiteDetails(
        product: Product,
        provider: OAuthProvider,
        userId: string,
        resources: AccessibleResource[]
    ): Promise<DetailedSiteInfo[]> {
        let newSites: DetailedSiteInfo[] = [];

        switch (product.key) {
            case ProductBitbucket.key:
                if (resources.length > 0) {
                    let resource = resources[0];
                    const hostname = provider === OAuthProvider.BitbucketCloud ? 'bitbucket.org' : 'staging.bb-inf.net';
                    const baseApiUrl =
                        provider === OAuthProvider.BitbucketCloud
                            ? 'https://api.bitbucket.org/2.0'
                            : 'https://api-staging.bb-inf.net/2.0';
                    const siteName =
                        provider === OAuthProvider.BitbucketCloud ? 'Bitbucket Cloud' : 'Bitbucket Staging Cloud';

                    const credentialId = CredentialManager.generateCredentialId(resource.id, userId);

                    // TODO: [VSCODE-496] find a way to embed and link to a bitbucket icon
                    newSites = [
                        {
                            avatarUrl: '',
                            baseApiUrl: baseApiUrl,
                            baseLinkUrl: resource.url,
                            host: hostname,
                            id: resource.id,
                            name: siteName,
                            product: ProductBitbucket,
                            isCloud: true,
                            userId: userId,
                            credentialId: credentialId
                        }
                    ];
                }
                break;
            case ProductJira.key:
                let apiUri =
                    provider === OAuthProvider.JiraCloudStaging ? 'api.stg.atlassian.com' : 'api.atlassian.com';

                //TODO: [VSCODE-505] call serverInfo endpoint when it supports OAuth
                //const baseUrlString = await getJiraCloudBaseUrl(`https://${apiUri}/ex/jira/${newResource.id}/rest/2`, authInfo.access);

                newSites = resources.map(r => {
                    const credentialId = CredentialManager.generateCredentialId(r.id, userId);

                    return {
                        avatarUrl: r.avatarUrl,
                        baseApiUrl: `https://${apiUri}/ex/jira/${r.id}/rest`,
                        baseLinkUrl: r.url,
                        host: new URL(r.url).host,
                        id: r.id,
                        name: r.name,
                        product: ProductJira,
                        isCloud: true,
                        userId: userId,
                        credentialId: credentialId
                    };
                });
                break;
        }

        return newSites;
    }

    public async userInitiatedServerLogin(site: SiteInfo, authInfo: AuthInfo): Promise<void> {
        if (isBasicAuthInfo(authInfo)) {
            try {
                const siteDetails = await this.saveDetailsForServerSite(site, authInfo);
                authenticatedEvent(siteDetails).then(e => {
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
                editedEvent(siteDetails).then(e => { this._analyticsClient.sendTrackEvent(e); });
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
                Authorization: authHeader
            },
            ...getAgent(site)
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
            pfxPassphrase: site.pfxPassphrase
        };

        if (site.product.key === ProductJira.key) {
            credentials.user = {
                displayName: json.displayName,
                id: userId,
                email: json.emailAddress,
                avatarUrl: json.avatarUrls['48x48']
            };
        } else {
            credentials.user = {
                displayName: json.displayName,
                id: userId,
                email: json.emailAddress,
                avatarUrl: json.avatarUrl
            };
        }

        await this._credentialManager.saveAuthInfo(siteDetails, credentials);
        this._siteManager.addSites([siteDetails]);

        return siteDetails;
    }
}
