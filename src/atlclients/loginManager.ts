import { window } from "vscode";
import { OAuthProvider, SiteInfo, oauthProviderForSite, OAuthInfo, DetailedSiteInfo, ProductBitbucket, ProductJira, AccessibleResource, Product, isBasicAuthInfo, AuthInfo, BasicAuthInfo } from "./authInfo";
import { authenticatedEvent } from "../analytics";
import { Logger } from "../logger";
import { OAuthDancer } from "./oauthDancer";
import { SiteManager } from "../siteManager";
import { CredentialManager } from "./authStore";
import { AnalyticsClient } from "../analytics-node-client/src";
import { v4 } from "uuid";
import axios from 'axios';

export class LoginManager {
    private _dancer: OAuthDancer = OAuthDancer.Instance;

    constructor(
        private _credentialManager: CredentialManager,
        private _siteManager: SiteManager,
        private _analyticsClient: AnalyticsClient) {
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
                user: resp.user,
            };

            const siteDetails = await this.getOAuthSiteDetails(site.product, provider, resp.user.id, resp.accessibleResources);

            if (siteDetails.length > 0) {
                await this._credentialManager.saveAuthInfo(siteDetails[0], oauthInfo);
                this._siteManager.addSites(siteDetails);
                authenticatedEvent(siteDetails[0]).then(e => { this._analyticsClient.sendTrackEvent(e); });
            }

            window.showInformationMessage(`You are now authenticated with ${site.product}`);

        } catch (e) {
            Logger.error(e, 'Error authenticating');
            if (typeof e === 'object' && e.cancelled !== undefined) {
                window.showWarningMessage(`${e.message}`);
            } else {
                window.showErrorMessage(`There was an error authenticating with provider '${provider}': ${e}`);
            }
        }
    }

    private async getOAuthSiteDetails(product: Product, provider: OAuthProvider, userId: string, resources: AccessibleResource[]): Promise<DetailedSiteInfo[]> {
        const knownSites = this._siteManager.getSitesAvailable(product);
        let newSites: DetailedSiteInfo[] = [];

        switch (product.key) {
            case ProductBitbucket.key:
                const bbResources = resources.filter(resource => !knownSites.some(site => resource.url.endsWith(site.hostname)));
                if (bbResources.length > 0) {
                    let resource = bbResources[0];
                    const hostname = (provider === OAuthProvider.BitbucketCloud) ? 'bitbucket.org' : 'staging.bb-inf.net';
                    const baseApiUrl = (provider === OAuthProvider.BitbucketCloud) ? 'https://api.bitbucket.org/2.0' : 'https://api-staging.bb-inf.net/2.0';
                    const siteName = (provider === OAuthProvider.BitbucketCloud) ? 'Bitbucket Cloud' : 'Bitbucket Staging Cloud';

                    // TODO: [VSCODE-496] find a way to embed and link to a bitbucket icon
                    newSites = [{
                        avatarUrl: "",
                        baseApiUrl: baseApiUrl,
                        baseLinkUrl: resource.url,
                        hostname: hostname,
                        id: resource.id,
                        name: siteName,
                        product: ProductBitbucket,
                        isCloud: true,
                        userId: userId,
                        credentialId: userId,
                    }];
                }
                break;
            case ProductJira.key:
                let apiUri = provider === OAuthProvider.JiraCloudStaging ? "api.stg.atlassian.com" : "api.atlassian.com";

                //TODO: [VSCODE-505] call serverInfo endpoint when it supports OAuth
                //const baseUrlString = await getJiraCloudBaseUrl(`https://${apiUri}/ex/jira/${newResource.id}/rest/2`, authInfo.access);

                newSites = resources.map(r => {
                    return {
                        avatarUrl: r.avatarUrl,
                        baseApiUrl: `https://${apiUri}/ex/jira/${r.id}/rest`,
                        baseLinkUrl: r.url,
                        hostname: (new URL(r.url)).hostname,
                        id: r.id,
                        name: r.name,
                        product: ProductJira,
                        isCloud: true,
                        userId: userId,
                        credentialId: userId,
                    };
                });
                break;
        }

        return newSites;
    }

    public async userInitiatedServerLogin(site: SiteInfo, authInfo: AuthInfo): Promise<void> {
        if (isBasicAuthInfo(authInfo)) {
            try {
                await this.saveDetailsForServerSite(site, authInfo);
            } catch (err) {
                const errorString = `Error authenticating with ${site.product.name}: ${err}`;
                Logger.error(new Error(errorString));
                return Promise.reject(errorString);
            }
        }
    }

    private async saveDetailsForServerSite(site: SiteInfo, credentials: BasicAuthInfo) {
        const authHeader = 'Basic ' + new Buffer(credentials.username + ':' + credentials.password).toString('base64');
        // For cloud instances we can use the user ID as the credential ID (they're globally unique). Server instances will
        // have a much smaller pool of user IDs so we use an arbitrary UUID as the credential ID.
        const credentialId = v4();

        let siteDetailsUrl = '';
        let avatarUrl = '';
        let apiUrl = '';
        switch (site.product.key) {
            case ProductJira.key:
                siteDetailsUrl = `https://${site.hostname}/rest/api/2/myself`;
                avatarUrl = `https://${site.hostname}/images/fav-jcore.png`;
                apiUrl = `https://${site.hostname}/rest`;
                break;
            case ProductBitbucket.key:
                siteDetailsUrl = `https://${site.hostname}/rest/api/1.0/users/${credentials.username}?avatarSize=64`;
                avatarUrl = '';
                apiUrl = `https://${site.hostname}`;
                break;
        }

        const res = await axios(siteDetailsUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader
            }
        });
        const json = res.data;

        const siteDetails = {
            product: site.product,
            isCloud: false,
            avatarUrl: avatarUrl,
            hostname: site.hostname,
            baseApiUrl: apiUrl,
            baseLinkUrl: `https://${site.hostname}`,
            id: site.hostname,
            name: site.hostname,
            userId: site.product.key === ProductJira.key ? json.id : json.slug,
            credentialId: credentialId,
        };

        if (site.product.key === ProductJira.key) {
            credentials.user = {
                displayName: json.displayName,
                id: json.id,
                email: json.emailAddress,
                avatarUrl: json.avatarUrls["48x48"],
            };
        } else {
            credentials.user = {
                displayName: json.displayName,
                id: json.slug,
                email: json.emailAddress,
                avatarUrl: json.avatarUrl,
            };
        }

        await this._credentialManager.saveAuthInfo(siteDetails, credentials);
        this._siteManager.addSites([siteDetails]);

        return json;
    }
}
