import { AuthInfo, Product, OAuthProvider, ProductJira, ProductBitbucket, getSecretForAuthInfo, emptyAuthInfo, AuthInfoEvent, AuthChangeType, DetailedSiteInfo, UpdateAuthInfoEvent, RemoveAuthInfoEvent, oauthProviderForSite, isOAuthInfo } from './authInfo';
import { keychain } from '../util/keychain';
import { window, Disposable, EventEmitter, Event, version } from 'vscode';
import { Logger } from '../logger';
import { setCommandContext, CommandContext } from '../constants';
import { loggedOutEvent } from '../analytics';
import debounce from 'lodash.debounce';
import { OAuthRefesher } from './oauthRefresher';
import { AnalyticsClient } from '../analytics-node-client/src';

const keychainServiceNameV2 = version.endsWith('-insider') ? "atlascode-insiders-authinfoV2" : "atlascode-authinfoV2";

interface CredentialIdToAuthInfo { [k: string]: AuthInfo; }

export class CredentialManager implements Disposable {
    private _memStore: Map<string, Map<string, AuthInfo>> = new Map<string, Map<string, AuthInfo>>();
    private _debouncedKeychain = new Object();
    private _refresher = new OAuthRefesher();

    constructor(private _analyticsClient: AnalyticsClient) {
        this._memStore.set(ProductJira.key, new Map<string, AuthInfo>());
        this._memStore.set(ProductBitbucket.key, new Map<string, AuthInfo>());
    }

    private _onDidAuthChange = new EventEmitter<AuthInfoEvent>();
    public get onDidAuthChange(): Event<AuthInfoEvent> {
        return this._onDidAuthChange.event;
    }

    dispose() {
        this._memStore.clear();
        this._onDidAuthChange.dispose();
    }

    public async getFirstAuthInfoForProduct(product: Product): Promise<AuthInfo | undefined> {
        let foundInfo: AuthInfo | undefined = undefined;

        let productAuths = this._memStore.get(product.key);

        if (productAuths) {
            foundInfo = productAuths.values().next().value;
        }


        if (!foundInfo && keychain) {
            try {
                let infoEntry = await this.getJsonAuthInfoFromKeychain(product.key) || undefined;
                if (infoEntry) {
                    let infos: CredentialIdToAuthInfo = JSON.parse(infoEntry);
                    if (infos) {
                        let entry = Object.entries(infos).values().next().value;

                        if (entry) {
                            foundInfo = entry[1];
                            if (foundInfo && productAuths) {
                                this._memStore.set(product.key, productAuths.set(entry[0], foundInfo));
                            }
                        }
                    }
                }
            } catch (e) {
                Logger.info(`keychain error ${e}`);
            }
        }

        return foundInfo;
    }

    public async getAuthInfo(site: DetailedSiteInfo): Promise<AuthInfo | undefined> {
        return this.getAuthInfoForProductAndCredentialId(site.product.key, site.credentialId);
    }

    public async saveAuthInfo(site: DetailedSiteInfo, info: AuthInfo): Promise<void> {
        const oldInfo = await this.getAuthInfo(site);

        let productAuths = this._memStore.get(site.product.key);

        if (!productAuths) {
            productAuths = new Map<string, AuthInfo>();
        }

        this._memStore.set(site.product.key, productAuths.set(site.credentialId, info));

        const hasNewInfo = (!oldInfo || (oldInfo && getSecretForAuthInfo(oldInfo) !== getSecretForAuthInfo(info)));

        if (hasNewInfo) {
            const cmdctx = this.commandContextFor(site.product);
            if (cmdctx !== undefined) {
                setCommandContext(cmdctx, info !== emptyAuthInfo ? true : false);
            }

            if (keychain) {
                try {
                    let credentialsForProduct: CredentialIdToAuthInfo = {};
                    let infoEntry = await this.getJsonAuthInfoFromKeychain(site.product.key) || undefined;
                    if (infoEntry) {
                        credentialsForProduct = JSON.parse(infoEntry);
                    }
                    credentialsForProduct[site.credentialId] = info;

                    await keychain.setPassword(keychainServiceNameV2, site.product.key, JSON.stringify(credentialsForProduct));
                }
                catch (e) {
                    Logger.debug("error saving auth info to keychain: ", e);
                }

                const updateEvent: UpdateAuthInfoEvent = { type: AuthChangeType.Update, site: site };
                this._onDidAuthChange.fire(updateEvent);
            }
        }
    }

    private async getAuthInfoForProductAndCredentialId(productKey: string, credentialId: string): Promise<AuthInfo | undefined> {
        Logger.debug('trying to get authInfo for credentialId', credentialId);
        let foundInfo: AuthInfo | undefined = undefined;
        let productAuths = this._memStore.get(productKey);

        Logger.debug('productAuths', productAuths);

        if (productAuths && productAuths.has(credentialId)) {
            foundInfo = productAuths.get(credentialId);

            Logger.debug('mem found info', foundInfo);
>>>>>>> VSCODE-593 Authenticating with arbitrary site
        }

        if (!foundInfo && keychain) {
            try {
<<<<<<< HEAD
                let infoEntry = await this.getJsonAuthInfoFromKeychain(site.product) || undefined;
                if (infoEntry) {
                    let infos: HostToAuthInfo = JSON.parse(infoEntry);

                    let info = infos[site.hostname];

                    if (info && productAuths) {
                        this._memStore.set(site.product.key, productAuths.set(site.hostname, info));
=======
                Logger.debug('getting info from keychain');
                let infoEntry = await this.getJsonAuthInfoFromKeychain(productKey) || undefined;
                if (infoEntry) {
                    Logger.debug(`found info entry for ${productKey}`);
                    let infoForProduct: CredentialIdToAuthInfo = JSON.parse(infoEntry);

                    Logger.debug(`infos`, infoForProduct);
                    let info = infoForProduct[credentialId];

                    Logger.debug(`info for user ${credentialId}`, info);
                    if (info && productAuths) {
                        Logger.debug(`setting info in memstore`);
                        this._memStore.set(productKey, productAuths.set(credentialId, info));

                        foundInfo = info;
                    }

                }
            } catch (e) {
                Logger.info(`keychain error ${e}`);
            }
        }

        return foundInfo;
        //return foundInfo ? foundInfo : Promise.reject(`no authentication info found for site ${site.hostname}`);
    }

    private async getJsonAuthInfoFromKeychain(productKey: string, serviceName?: string): Promise<string | null> {
        let svcName = keychainServiceNameV2;

        if (serviceName) {
            svcName = serviceName;
        }

        if (!this._debouncedKeychain[productKey]) {
            this._debouncedKeychain[productKey] = debounce(async () => await keychain!.getPassword(svcName, productKey), 500, { leading: true });
        }
        return await this._debouncedKeychain[productKey]();
    }

    public async refreshAccessToken(site: DetailedSiteInfo): Promise<string | undefined> {
        const credentials = await this.getAuthInfo(site);
        if (!isOAuthInfo(credentials)) {
            return undefined;
        }

        const provider: OAuthProvider | undefined = oauthProviderForSite(site);
        let newAccessToken = undefined;
        if (provider && credentials) {
            newAccessToken = await this._refresher.getNewAccessToken(provider, credentials.refresh);
            if (newAccessToken) {
                credentials.access = newAccessToken;
                this.saveAuthInfo(site, credentials);
            }
        }
        return newAccessToken;
    }

    public async removeAuthInfo(site: DetailedSiteInfo): Promise<boolean> {
        let productAuths = this._memStore.get(site.product.key);
        let wasKeyDeleted = false;
        let wasMemDeleted = false;
        if (productAuths) {
            wasMemDeleted = productAuths.delete(site.credentialId);
            this._memStore.set(site.product.key, productAuths);
        }

        if (keychain) {
            let infoEntry = await this.getJsonAuthInfoFromKeychain(site.product.key) || undefined;
            if (infoEntry) {
                let infos: CredentialIdToAuthInfo = JSON.parse(infoEntry);
                wasKeyDeleted = Object.keys(infos).includes(site.credentialId);
                delete infos[site.credentialId];

                await keychain.setPassword(keychainServiceNameV2, site.product.key, JSON.stringify(infos));
            }
        }

        if (wasMemDeleted || wasKeyDeleted) {
            const cmdctx = this.commandContextFor(site.product);
            if (cmdctx) {
                setCommandContext(cmdctx, false);
            }

            let name = site.name;

            const removeEvent: RemoveAuthInfoEvent = { type: AuthChangeType.Remove, product: site.product, credentialId: site.credentialId };
            this._onDidAuthChange.fire(removeEvent);

            window.showInformationMessage(`You have been logged out of ${site.product.name}: ${name}`);

            loggedOutEvent(site.product.name).then(e => { this._analyticsClient.sendTrackEvent(e); });
            return true;
        }

        return false;
    }

    private commandContextFor(product: Product): string | undefined {
        switch (product.key) {
            case ProductJira.key:
                return CommandContext.IsJiraAuthenticated;
            case ProductBitbucket.key:
                return CommandContext.IsBBAuthenticated;
        }
        return undefined;
    }
<<<<<<< HEAD

    public async removeV1AuthInfo(provider: string) {
        this._memStore.delete(provider);

        if (keychain) {
            await keychain.deletePassword(keychainServiceNameV1, provider);
        }
    }

    public async convertLegacyAuthInfo(defaultSite?: AccessibleResourceV1) {
        let jiraInfo: HostToAuthInfo | undefined = undefined;
        let bbInfo: HostToAuthInfo | undefined = undefined;

        const _refresher = new OAuthRefesher();
        let jiraSites: DetailedSiteInfo[] = [];
        let bbSites: DetailedSiteInfo[] = [];
        if (keychain) {
            for (const provider of Object.values(OAuthProvider)) {
                try {
                    let infoEntry = await this.getJsonAuthInfoFromKeychain({ key: provider, name: 'legacy' }, keychainServiceNameV1) || undefined;
                    if (infoEntry) {
                        let info: AuthInfoV1 = JSON.parse(infoEntry);

                        if (provider.startsWith('jira')) {
                            const newAccess = await _refresher.getNewAccessToken(provider, info.refresh);
                            if (!newAccess) {
                                continue;
                            }
                            if (info.accessibleResources) {
                                for (const resource of info.accessibleResources) {
                                    if (jiraInfo === undefined) {
                                        jiraInfo = {};
                                    }

                                    let apiUri = provider === OAuthProvider.JiraCloudStaging ? "api.stg.atlassian.com" : "api.atlassian.com";

                                    // TODO: [VSCODE-505] call serverInfo endpoint when it supports OAuth
                                    //const baseUrlString = await getJiraCloudBaseUrl(`https://${apiUri}/ex/jira/${resource.id}/rest/2`, newAccess);

                                    const baseUrlString = provider === OAuthProvider.JiraCloudStaging ? `https://${resource.name}.jira-dev.com` : `https://${resource.name}.atlassian.net`;

                                    const baseUrl: URL = new URL(baseUrlString);

                                    const newInfo: OAuthInfo = {
                                        access: newAccess,
                                        refresh: info.refresh,
                                        provider: info.user.provider,
                                        user: {
                                            displayName: info.user.displayName,
                                            id: info.user.id
                                        }
                                    };
                                    jiraInfo[baseUrl.hostname] = newInfo;


                                    let newSite: DetailedSiteInfo = {
                                        avatarUrl: resource.avatarUrl,
                                        baseApiUrl: `https://${apiUri}/ex/jira/${resource.id}/rest`,
                                        baseLinkUrl: baseUrlString,
                                        hostname: baseUrl.hostname,
                                        id: resource.id,
                                        name: resource.name,
                                        product: ProductJira,
                                        isCloud: true,
                                    };

                                    jiraSites.push(newSite);


                                    if (defaultSite && defaultSite.id === resource.id) {
                                        const oldProject = Container.config.jira.workingProject;
                                        await configuration.setDefaultSite(newSite);
                                        await configuration.setWorkingProject(oldProject);

                                        if (!this.isDebugging) {
                                            configuration.setWorkingSite(undefined);
                                        }
                                    }
                                }
                            }
                        } else {
                            if (bbInfo === undefined) {
                                bbInfo = {};
                            }

                            const hostname = (provider === OAuthProvider.BitbucketCloud) ? 'bitbucket.org' : 'staging.bb-inf.net';
                            const baseApiUrl = (provider === OAuthProvider.BitbucketCloud) ? 'https://api.bitbucket.org/2.0' : 'https://api-staging.bb-inf.net/2.0';
                            const siteName = (provider === OAuthProvider.BitbucketCloud) ? 'Bitbucket Cloud' : 'Bitbucket Staging Cloud';
                            const newInfo: OAuthInfo = {
                                access: info.access,
                                refresh: info.refresh,
                                provider: provider,
                                user: {
                                    displayName: info.user.displayName,
                                    id: info.user.id
                                }
                            };

                            bbInfo[hostname] = newInfo;

                            // TODO: [VSCODE-496] find a way to embed and link to a bitbucket icon
                            bbSites.push({
                                avatarUrl: "",
                                baseApiUrl: baseApiUrl,
                                baseLinkUrl: `https://${hostname}`,
                                hostname: hostname,
                                id: provider,
                                name: siteName,
                                product: ProductBitbucket,
                                isCloud: true,
                            });
                        }
                    }

                    if (!this.isDebugging) {
                        await this.removeV1AuthInfo(provider);
                    }
                } catch (e) {
                    Logger.error(e, 'error converting legacy auth info!');
                }
            }
        }

        if (jiraSites.length > 0) {
            this._globalStore.update(`${ProductJira.key}Sites`, jiraSites);
        }

        if (bbSites.length > 0) {
            this._globalStore.update(`${ProductBitbucket.key}Sites`, bbSites);
        }

        if (jiraInfo !== undefined) {
            this._memStore.set(ProductJira.key, new Map(Object.entries(jiraInfo)));

            if (keychain) {
                try {
                    if (this.isDebugging()) {
                        const infoEntry = await this.getJsonAuthInfoFromKeychain(ProductJira);
                        if (infoEntry) {
                            let infos: HostToAuthInfo = JSON.parse(infoEntry);
                            jiraInfo = { ...jiraInfo, ...infos };
                        }
                    }

                    await keychain.setPassword(keychainServiceNameV2, ProductJira.key, JSON.stringify(jiraInfo));
                }
                catch (e) {
                    Logger.debug("error saving jira auth info to keychain: ", e);
                }
            }
        }

        if (bbInfo !== undefined) {
            this._memStore.set(ProductBitbucket.key, new Map(Object.entries(bbInfo)));
            if (keychain) {
                try {
                    const infoEntry = await this.getJsonAuthInfoFromKeychain(ProductBitbucket);
                    if (infoEntry) {
                        let infos: HostToAuthInfo = JSON.parse(infoEntry);
                        bbInfo = { ...bbInfo, ...infos };
                    }

                    await keychain.setPassword(keychainServiceNameV2, ProductBitbucket.key, JSON.stringify(bbInfo));
                }
                catch (e) {
                    Logger.debug("error saving bitbucket auth info to keychain: ", e);
                }
            }
        }
    }

    private isDebugging(): boolean {
        let isDebugging = false;
        try {
            const args = process.execArgv;
            isDebugging = args ? args.some(arg => /^--(debug|inspect)\b(-brk\b|(?!-))=?/.test(arg)) : false;
        }
        catch { }
        return isDebugging;
    }
=======
>>>>>>> VSCODE-593 Authenticating with arbitrary site
}
