import { AuthInfoV1, AuthInfo, Product, SiteInfo, OAuthProvider, AccessibleResource, ProductJira, ProductBitbucket, OAuthInfo, getSecretForAuthInfo, emptyAuthInfo, AuthInfoEvent, AuthChangeType, isDetailedSiteInfo, DetailedSiteInfo, UpdateAuthInfoEvent, RemoveAuthInfoEvent } from './authInfo';
import { keychain } from '../util/keychain';
import { window, Disposable, EventEmitter, Event, Memento } from 'vscode';
import { Logger } from '../logger';
import { setCommandContext, CommandContext } from '../constants';
import { loggedOutEvent } from '../analytics';
import { Container } from '../container';
import debounce from 'lodash.debounce';
import { OAuthDancer } from './oauthDancer';
//import { getJiraCloudBaseUrl } from './serverInfo';
import { configuration } from '../config/configuration';

const keychainServiceNameV1 = "atlascode-authinfo";
const keychainServiceNameV2 = "atlascode-authinfoV2";

interface HostToAuthInfo { [k: string]: AuthInfo; }

export class AuthManager implements Disposable {
    private _memStore: Map<string, Map<string, AuthInfo>> = new Map<string, Map<string, AuthInfo>>();
    private _debouncedKeychain = new Object();
    private _globalStore: Memento;

    constructor(globalStore: Memento) {
        this._globalStore = globalStore;
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

    private async getJsonAuthInfoFromKeychain(product: Product, serviceName?: string): Promise<string | null> {
        let svcName = keychainServiceNameV2;

        if (serviceName) {
            svcName = serviceName;
        }

        if (!this._debouncedKeychain[product.key]) {
            this._debouncedKeychain[product.key] = debounce(async () => await keychain!.getPassword(svcName, product.key), 500, { leading: true });
        }
        return await this._debouncedKeychain[product.key]();
    }

    public async isProductAuthenticated(product: Product): Promise<boolean> {
        return await this.getFirstAuthInfoForProduct(product) !== undefined;
    }

    public async isSiteAuthenticated(site: SiteInfo): Promise<boolean> {
        return await this.getAuthInfo(site) !== undefined;
    }

    public async getFirstAuthInfoForProduct(product: Product): Promise<AuthInfo | undefined> {
        let foundInfo: AuthInfo | undefined = undefined;

        let productAuths = this._memStore.get(product.key);

        if (productAuths) {
            foundInfo = productAuths.values().next().value;
        }


        if (!foundInfo && keychain) {
            try {
                let infoEntry = await this.getJsonAuthInfoFromKeychain(product) || undefined;
                if (infoEntry) {
                    let infos: HostToAuthInfo = JSON.parse(infoEntry);
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

    public async getAuthInfo(site: SiteInfo): Promise<AuthInfo> {
        Logger.debug('trying to get authInfo for site', site.hostname);
        let foundInfo: AuthInfo | undefined = undefined;
        let productAuths = this._memStore.get(site.product.key);

        Logger.debug('productAuths', productAuths);

        if (productAuths && productAuths.has(site.hostname)) {
            foundInfo = productAuths.get(site.hostname);

            Logger.debug('mem found info', foundInfo);
        }

        if (!foundInfo && keychain) {
            try {
                Logger.debug('getting info from keychain');
                let infoEntry = await this.getJsonAuthInfoFromKeychain(site.product) || undefined;
                if (infoEntry) {
                    Logger.debug(`found info entry for ${site.product}`);
                    let infos: HostToAuthInfo = JSON.parse(infoEntry);

                    Logger.debug(`infos`, infos);
                    let info = infos[site.hostname];

                    Logger.debug(`info for hostname ${site.hostname}`, info);
                    if (info && productAuths) {
                        Logger.debug(`setting info in memstore`);
                        this._memStore.set(site.product.key, productAuths.set(site.hostname, info));

                        foundInfo = info;
                    }

                }
            } catch (e) {
                Logger.info(`keychain error ${e}`);
            }
        }

        return foundInfo ? foundInfo : Promise.reject(`no authentication info found for site ${site.hostname}`);
    }

    public async saveAuthInfo(site: DetailedSiteInfo, info: AuthInfo): Promise<void> {
        const oldInfo = await this.getAuthInfo(site);

        let productAuths = this._memStore.get(site.product.key);

        if (!productAuths) {
            productAuths = new Map<string, AuthInfo>();
        }

        this._memStore.set(site.product.key, productAuths.set(site.hostname, info));

        const hasNewInfo = (!oldInfo || (oldInfo && getSecretForAuthInfo(oldInfo) !== getSecretForAuthInfo(info)));

        if (hasNewInfo) {
            const cmdctx = this.commandContextFor(site.product);
            if (cmdctx !== undefined) {
                setCommandContext(cmdctx, info !== emptyAuthInfo ? true : false);
            }

            if (keychain) {
                try {
                    let infos: HostToAuthInfo = {};
                    let infoEntry = await this.getJsonAuthInfoFromKeychain(site.product) || undefined;
                    if (infoEntry) {
                        infos = JSON.parse(infoEntry);
                        infos[site.hostname] = info;
                    }

                    await keychain.setPassword(keychainServiceNameV2, site.product.key, JSON.stringify(infos));
                }
                catch (e) {
                    Logger.debug("error saving auth info to keychain: ", e);
                }

                const updateEvent: UpdateAuthInfoEvent = { type: AuthChangeType.Update, site: site, authInfo: info };
                this._onDidAuthChange.fire(updateEvent);
            }
        }
    }

    public async removeAuthInfo(site: SiteInfo): Promise<boolean> {
        let productAuths = this._memStore.get(site.product.key);
        let wasKeyDeleted = false;
        let wasMemDeleted = false;
        if (productAuths) {
            wasMemDeleted = productAuths.delete(site.hostname);
            this._memStore.set(site.product.key, productAuths);
        }

        if (keychain) {
            let infoEntry = await this.getJsonAuthInfoFromKeychain(site.product) || undefined;
            if (infoEntry) {
                let infos: HostToAuthInfo = JSON.parse(infoEntry);
                wasKeyDeleted = Object.keys(infos).includes(site.hostname);
                delete infos[site.hostname];

                await keychain.setPassword(keychainServiceNameV2, site.product.key, JSON.stringify(infos));
            }
        }

        if (wasMemDeleted || wasKeyDeleted) {
            const cmdctx = this.commandContextFor(site.product);
            if (cmdctx) {
                setCommandContext(cmdctx, false);
            }

            let name = isDetailedSiteInfo(site) ? site.name : site.hostname;

            const removeEvent: RemoveAuthInfoEvent = { type: AuthChangeType.Remove, authInfo: undefined, site: site };
            this._onDidAuthChange.fire(removeEvent);

            window.showInformationMessage(`You have been logged out of ${site.product.name}: ${name}`);

            loggedOutEvent(site.product.name).then(e => { Container.analyticsClient.sendTrackEvent(e); });
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

    public async removeV1AuthInfo(provider: string) {
        this._memStore.delete(provider);

        if (keychain) {
            await keychain.deletePassword(keychainServiceNameV1, provider);
        }
    }

    public async convertLegacyAuthInfo(defaultSite?: AccessibleResource) {
        let jiraInfo: HostToAuthInfo | undefined = undefined;
        let bbInfo: HostToAuthInfo | undefined = undefined;

        const _dancer = new OAuthDancer();
        let jiraSites: DetailedSiteInfo[] = [];
        let bbSites: DetailedSiteInfo[] = [];
        if (keychain) {
            for (const provider of Object.values(OAuthProvider)) {
                Logger.debug('converting auth provider', provider);
                try {
                    let infoEntry = await this.getJsonAuthInfoFromKeychain({ key: provider, name: 'legacy' }, keychainServiceNameV1) || undefined;
                    Logger.debug('got legacy auth info', infoEntry);
                    if (infoEntry) {
                        let info: AuthInfoV1 = JSON.parse(infoEntry);

                        if (provider.startsWith('jira')) {
                            const newAccess = await _dancer.getNewAccessToken(provider, info.refresh);
                            Logger.debug('new access token is', newAccess);
                            if (!newAccess) {
                                continue;
                            }
                            if (info.accessibleResources) {
                                for (const resource of info.accessibleResources) {
                                    if (jiraInfo === undefined) {
                                        jiraInfo = {};
                                    }

                                    Logger.debug('processing resource', resource.name);
                                    let apiUri = provider === OAuthProvider.JiraCloudStaging ? "api.stg.atlassian.com" : "api.atlassian.com";
                                    Logger.debug('trying to get base url', provider);

                                    // TODO: [VSCODE-505] call serverInfo endpoint when it supports OAuth
                                    //const baseUrlString = await getJiraCloudBaseUrl(`https://${apiUri}/ex/jira/${resource.id}/rest/2`, newAccess);

                                    const baseUrlString = provider === OAuthProvider.JiraCloudStaging ? `https://${resource.name}.jira-dev.com` : `https://${resource.name}.atlassian.net`;

                                    Logger.debug('got base url', baseUrlString);
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

                                    Logger.debug('set jira info', jiraInfo);

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

                                    Logger.debug('added site', newSite);

                                    if (defaultSite && defaultSite.id === resource.id) {
                                        const oldProject = Container.config.jira.workingProject;
                                        await configuration.setDefaultSite(newSite);
                                        await configuration.setWorkingProject(oldProject);

                                        Logger.debug('set default site site', newSite);

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
            Logger.debug('updating global store', `${ProductJira.key}Sites`);
            this._globalStore.update(`${ProductJira.key}Sites`, jiraSites);
        }

        if (bbSites.length > 0) {
            this._globalStore.update(`${ProductBitbucket.key}Sites`, bbSites);
        }

        if (jiraInfo !== undefined) {
            Logger.debug('updating mem store', jiraInfo);
            this._memStore.set(ProductJira.key, new Map(Object.entries(jiraInfo)));

            if (keychain) {
                try {
                    Logger.debug('updating key store', JSON.stringify(jiraInfo));
                    await keychain.setPassword(keychainServiceNameV2, ProductJira.key, JSON.stringify(jiraInfo));
                }
                catch (e) {
                    Logger.debug("error saving jira auth info to keychain: ", e);
                }
            }
        }

        if (bbInfo !== undefined) {
            Logger.debug('updating mem store', bbInfo);
            this._memStore.set(ProductBitbucket.key, new Map(Object.entries(bbInfo)));
            if (keychain) {
                try {
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
}
