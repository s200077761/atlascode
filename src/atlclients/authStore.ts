import { AuthInfoV1, AuthInfo, Product, SiteInfo, OAuthProvider, AccessibleResource, ProductJira, ProductBitbucket, OAuthInfo, getSecretForAuthInfo, emptyAuthInfo, AuthInfoEvent, AuthChangeType, isDetailedSiteInfo, DetailedSiteInfo, UpdateAuthInfoEvent, RemoveAuthInfoEvent } from './authInfo';
import { keychain } from '../util/keychain';
import { window, Disposable, EventEmitter, Event, Memento } from 'vscode';
import { Logger } from '../logger';
import { setCommandContext, CommandContext } from '../constants';
import { loggedOutEvent } from '../analytics';
import { Container } from '../container';
import debounce from 'lodash.debounce';
import { OAuthDancer } from './oauthDancer';
import { getJiraCloudBaseUrl } from './serverInfo';
import { configuration } from '../config/configuration';

const keychainServiceNameV1 = "atlascode-authinfo";
const keychainServiceNameV2 = "atlascode-authinfoV2";

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
                    let infos: Map<string, AuthInfo> = JSON.parse(infoEntry);
                    if (infos) {
                        let entry = infos.entries().next().value;

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

    public async getAuthInfo(site: SiteInfo): Promise<AuthInfo | undefined> {
        let foundInfo: AuthInfo | undefined = undefined;
        let productAuths = this._memStore.get(site.product.key);

        if (productAuths && productAuths.has(site.hostname)) {
            foundInfo = productAuths.get(site.hostname);
        }

        if (!foundInfo && keychain) {
            try {
                let infoEntry = await this.getJsonAuthInfoFromKeychain(site.product) || undefined;
                if (infoEntry) {
                    let infos: Map<string, AuthInfo> = JSON.parse(infoEntry);
                    let info = infos.get(site.hostname);
                    if (info && productAuths) {
                        this._memStore.set(site.product.key, productAuths.set(site.hostname, info));
                        return info;
                    }

                }
            } catch (e) {
                Logger.info(`keychain error ${e}`);
            }
        }

        return undefined;
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
                    let infos: Map<string, AuthInfo> = new Map<string, AuthInfo>();
                    let infoEntry = await this.getJsonAuthInfoFromKeychain(site.product) || undefined;
                    if (infoEntry) {
                        infos = JSON.parse(infoEntry);
                    }

                    await keychain.setPassword(keychainServiceNameV2, site.product.key, JSON.stringify(infos.set(site.hostname, info)));
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
                let infos: Map<string, AuthInfo> = JSON.parse(infoEntry);
                wasKeyDeleted = infos.delete(site.hostname);
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
        let jiraInfo: Map<string, AuthInfo> | undefined = undefined;
        let bbInfo: Map<string, AuthInfo> | undefined = undefined;
        const _dancer = new OAuthDancer();
        let jiraSites: DetailedSiteInfo[] = [];
        let bbSites: DetailedSiteInfo[] = [];
        if (keychain) {
            for (const provider of Object.values(OAuthProvider)) {
                try {
                    let infoEntry = await this.getJsonAuthInfoFromKeychain({ key: provider, name: 'legacy' }, keychainServiceNameV1) || undefined;
                    if (infoEntry) {
                        let info: AuthInfoV1 = JSON.parse(infoEntry);

                        if (provider.startsWith('jira')) {
                            const newAccess = await _dancer.getNewAccessToken(provider, info.refresh);
                            if (!newAccess) {
                                continue;
                            }
                            if (info.accessibleResources) {
                                info.accessibleResources.forEach(async (resource: AccessibleResource) => {
                                    if (jiraInfo === undefined) {
                                        jiraInfo = new Map<string, AuthInfo>();
                                    }

                                    let apiUri = provider === OAuthProvider.JiraCloudStaging ? "api.stg.atlassian.com" : "api.atlassian.com";
                                    const baseUrlString = await getJiraCloudBaseUrl(`https://${apiUri}/ex/jira/${resource.id}/rest/2`, newAccess);
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
                                    jiraInfo.set(baseUrl.hostname, newInfo);

                                    let newSite: DetailedSiteInfo = {
                                        avatarUrl: resource.avatarUrl,
                                        baseApiUrl: `https://${apiUri}/ex/jira/${resource.id}/rest/2`,
                                        baseLinkUrl: baseUrlString,
                                        hostname: baseUrl.hostname,
                                        id: resource.id,
                                        name: resource.name,
                                        product: ProductJira,
                                        isCloud: true,
                                    };

                                    jiraSites.push(newSite);

                                    if (defaultSite && defaultSite.id === resource.id) {
                                        configuration.setDefaultSite(newSite);

                                        if (!Container.isDebugging) {
                                            configuration.setWorkingSite(undefined);
                                        }
                                    }
                                });
                            }
                        } else {
                            if (bbInfo === undefined) {
                                bbInfo = new Map<string, AuthInfo>();
                            }

                            const hostname = (provider === OAuthProvider.BitbucketCloud) ? 'bitbucket.org' : 'staging.bb-inf.net';
                            const baseApiUrl = (provider === OAuthProvider.BitbucketCloud) ? 'api.bitbucket.org/2.0' : 'api-staging.bb-inf.net/2.0';
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

                            bbInfo.set(hostname, newInfo);

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

                    if (!Container.isDebugging) {
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
            this._memStore.set(ProductJira.key, new Map<string, AuthInfo>());

            if (keychain) {
                try {
                    await keychain.setPassword(keychainServiceNameV2, ProductJira.key, JSON.stringify(jiraInfo));
                }
                catch (e) {
                    Logger.debug("error saving jira auth info to keychain: ", e);
                }
            }
        }

        if (bbInfo !== undefined) {
            this._memStore.set(ProductBitbucket.key, new Map<string, AuthInfo>());
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
}
