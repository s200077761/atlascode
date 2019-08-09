import { keychain } from "../util/keychain";
import { Logger } from "../logger";
import { DetailedSiteInfo, OAuthProvider, AuthInfoV1, OAuthInfo, ProductJira, ProductBitbucket, AccessibleResourceV1 } from "../atlclients/authInfo";
import debounce from 'lodash.debounce';
import { SiteManager } from "../siteManager";
import { CredentialManager } from "../atlclients/authStore";
import { OAuthRefesher } from "../atlclients/oauthRefresher";
import { configuration } from "../config/configuration";

const keychainServiceNameV1 = "atlascode-authinfo";

export class V1toV2Migrator {
    private _debouncedKeychain = new Object();
    private _refresher = new OAuthRefesher();
    private _workingProject: any | undefined;
    private _defaultSiteId: string | undefined;

    constructor(private _siteManager: SiteManager,
        private _credentialManager: CredentialManager,
        private _deleteV1: boolean,
        workingProject?: any,
        defaultSite?: AccessibleResourceV1) {
        this._workingProject = workingProject;
        this._defaultSiteId = defaultSite ? defaultSite.id : undefined;
    }

    public async convertLegacyAuthInfo() {
        for (const provider of Object.values(OAuthProvider)) {
            await this.migrateForOauthProvider(provider);
        }
    }

    private async getV1JsonAuthInfoFromKeychain(productKey: string): Promise<string | null> {
        let svcName = keychainServiceNameV1;

        if (!this._debouncedKeychain[productKey]) {
            this._debouncedKeychain[productKey] = debounce(async () => await keychain!.getPassword(svcName, productKey), 500, { leading: true });
        }
        return await this._debouncedKeychain[productKey]();
    }

    private async migrateForOauthProvider(provider: OAuthProvider) {
        Logger.debug('converting auth provider', provider);
        try {
            let infoEntry = await this.getV1JsonAuthInfoFromKeychain(provider) || undefined;
            Logger.debug('got legacy auth info', infoEntry);
            if (infoEntry) {
                let info: AuthInfoV1 = JSON.parse(infoEntry);

                if (provider.startsWith('jira')) {
                    const newAccess = await this._refresher.getNewAccessToken(provider, info.refresh);
                    Logger.debug('new access token is', newAccess);
                    if (newAccess && info.accessibleResources) {
                        this.migrateJiraData(info, provider, newAccess);
                    }
                } else {
                    this.migrateBitbucketData(info, provider);
                }
            }

            if (this._deleteV1) {
                await this.removeV1AuthInfo(provider);
            }
        } catch (e) {
            Logger.error(e, 'error converting legacy auth info!');
        }
    }

    private async migrateJiraData(info: AuthInfoV1, provider: OAuthProvider, accessToken: string) {
        const newSites: DetailedSiteInfo[] = [];

        for (const resource of info.accessibleResources!) {
            Logger.debug('processing resource', resource.name);
            let apiUri = provider === OAuthProvider.JiraCloudStaging ? "api.stg.atlassian.com" : "api.atlassian.com";
            Logger.debug('trying to get base url', provider);

            // TODO: [VSCODE-505] call serverInfo endpoint when it supports OAuth
            //const baseUrlString = await getJiraCloudBaseUrl(`https://${apiUri}/ex/jira/${resource.id}/rest/2`, newAccess);

            // const baseUrlString = provider === OAuthProvider.JiraCloudStaging ? `https://${resource.name}.jira-dev.com` : `https://${resource.name}.atlassian.net`;
            const baseUrlString = (resource as any).url;

            Logger.debug('got base url', baseUrlString);
            const baseUrl: URL = new URL(baseUrlString);

            const newInfo: OAuthInfo = {
                access: accessToken,
                refresh: info.refresh,
                user: { id: info.user.id, displayName: info.user.displayName },
            };

            let newSite: DetailedSiteInfo = {
                avatarUrl: resource.avatarUrl,
                baseApiUrl: `https://${apiUri}/ex/jira/${resource.id}/rest`,
                baseLinkUrl: baseUrlString,
                hostname: baseUrl.hostname,
                id: resource.id,
                name: resource.name,
                product: ProductJira,
                isCloud: true,
                userId: info.user.id
            };

            await this._credentialManager.saveAuthInfo(newSite, newInfo);

            Logger.debug('added site', newSite);

            if (this._defaultSiteId === resource.id) {
                this.updateDefaultSiteInfo(newSite);
            }
            newSites.push(newSite);
        }
        this._siteManager.addSites(newSites);
    }

    private async updateDefaultSiteInfo(newSite: DetailedSiteInfo) {
        if (this._deleteV1) {
            configuration.setWorkingSite(undefined);
        }

        await configuration.setDefaultSite(newSite);
        await configuration.setWorkingProject(this._workingProject);

        Logger.debug('set default site site', newSite);
    }

    private async migrateBitbucketData(info: AuthInfoV1, provider: OAuthProvider) {
        const hostname = (provider === OAuthProvider.BitbucketCloud) ? 'bitbucket.org' : 'staging.bb-inf.net';
        const baseApiUrl = (provider === OAuthProvider.BitbucketCloud) ? 'https://api.bitbucket.org/2.0' : 'https://api-staging.bb-inf.net/2.0';
        const siteName = (provider === OAuthProvider.BitbucketCloud) ? 'Bitbucket Cloud' : 'Bitbucket Staging Cloud';
        const newInfo: OAuthInfo = {
            access: info.access,
            refresh: info.refresh,
            user: { id: info.user.id, displayName: info.user.displayName },
        };

        // TODO: [VSCODE-496] find a way to embed and link to a bitbucket icon
        const newSite = {
            avatarUrl: "",
            baseApiUrl: baseApiUrl,
            baseLinkUrl: `https://${hostname}`,
            hostname: hostname,
            id: provider,
            name: siteName,
            product: ProductBitbucket,
            isCloud: true,
            userId: info.user.id,
        };

        this._siteManager.addSites([newSite]);
        await this._credentialManager.saveAuthInfo(newSite, newInfo);
    }

    private async removeV1AuthInfo(provider: string) {
        if (keychain) {
            await keychain.deletePassword(keychainServiceNameV1, provider);
        }
    }
}
