import { Disposable, EventEmitter, Event, Memento } from "vscode";
import { ProductJira, ProductBitbucket, AuthInfoEvent, Product, DetailedSiteInfo, isUpdateAuthEvent, emptySiteInfo, isEmptySiteInfo } from "./atlclients/authInfo";
import { Container } from "./container";
import { configuration } from "./config/configuration";
import { Logger } from "./logger";



export type SitesAvailableUpdateEvent = {
    sites: DetailedSiteInfo[];
    product: Product;
};

const SitesSuffix: string = 'Sites';

export class SiteManager extends Disposable {
    private _disposable: Disposable;
    private _sitesAvailable: Map<string, DetailedSiteInfo[]>;
    private _globalStore: Memento;

    private _onDidSitesAvailableChange = new EventEmitter<SitesAvailableUpdateEvent>();
    public get onDidSitesAvailableChange(): Event<SitesAvailableUpdateEvent> {
        return this._onDidSitesAvailableChange.event;
    }

    constructor(globalStore: Memento) {
        super(() => this.dispose());

        this._globalStore = globalStore;
        this._sitesAvailable = new Map<string, DetailedSiteInfo[]>();
        this._sitesAvailable.set(ProductJira.key, []);
        this._sitesAvailable.set(ProductBitbucket.key, []);

        this._disposable = Disposable.from(
            Container.authManager.onDidAuthChange(this.onDidAuthChange, this)
        );
    }

    dispose() {
        this._disposable.dispose();
        this._onDidSitesAvailableChange.dispose();
    }

    onDidAuthChange(e: AuthInfoEvent) {
        let notify = false;
        let sites = this._globalStore.get<DetailedSiteInfo[]>(`${e.site.product.key}${SitesSuffix}`);
        if (!sites) {
            sites = [];
        }

        if (isUpdateAuthEvent(e)) {
            if (!sites.find(site => site.hostname === e.site.hostname)) {
                notify = true;
                sites.push(e.site);
                this._globalStore.update(`${e.site.product.key}${SitesSuffix}`, sites);
                this._sitesAvailable.set(e.site.product.key, sites);
            }
        } else {
            const foundIndex = sites.findIndex(site => site.hostname === e.site.hostname);
            if (foundIndex > -1) {
                notify = true;
                sites.splice(foundIndex, 1);
                this._globalStore.update(`${e.site.product.key}${SitesSuffix}`, sites);
                this._sitesAvailable.set(e.site.product.key, sites);
            }
        }

        if (notify) {
            this._onDidSitesAvailableChange.fire({ sites: sites, product: e.site.product });
        }
    }

    public getSitesAvailable(product: Product): DetailedSiteInfo[] {
        let sites = this._sitesAvailable.get(product.key);

        if (!sites || sites.length < 1) {
            sites = this._globalStore.get<DetailedSiteInfo[]>(`${product.key}${SitesSuffix}`);
            if (!sites) {
                sites = [];
            }

            this._sitesAvailable.set(product.key, sites);
        }

        return sites;
    }

    public productHasAtLeastOneSite(product: Product): boolean {
        return this.getSitesAvailable(product).length > 0;
    }

    public getSiteForHostname(product: Product, hostname: string): DetailedSiteInfo | undefined {
        return this.getSitesAvailable(product).find(site => site.hostname === hostname);
    }

    public effectiveSite(product: Product): DetailedSiteInfo {
        let defaultSite = emptySiteInfo;
        switch (product.key) {
            case ProductJira.key:
                Logger.debug(`getting siteInfo for ${product.key}`);
                const configSite = Container.config.jira.defaultSite;
                if (configSite && !isEmptySiteInfo(configSite)) {
                    Logger.debug(`got site from config`, configSite);
                    defaultSite = configSite;
                } else {
                    const sites = this.getSitesAvailable(product);
                    if (sites && sites.length > 0) {
                        defaultSite = sites[0];
                        configuration.setDefaultSite(defaultSite);
                    }
                }
                break;

            case ProductBitbucket.key:
                const sites = this.getSitesAvailable(product);
                if (sites && sites.length > 0) {
                    defaultSite = sites[0];
                }
                break;

        }
        return defaultSite;
    }
}