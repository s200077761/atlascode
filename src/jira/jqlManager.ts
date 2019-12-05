import { v4 } from "uuid";
import { ConfigurationChangeEvent, ConfigurationTarget, Disposable, Event, EventEmitter } from "vscode";
import { DetailedSiteInfo, ProductJira } from "../atlclients/authInfo";
import { configuration } from "../config/configuration";
import { JQLEntry } from "../config/model";
import { Container } from "../container";
import { Logger } from "../logger";

export type JQLUpdateEvent = {
    jqlEntries: JQLEntry[];
};

export class JQLManager extends Disposable {
    private _disposable: Disposable;

    private _onDidJQLChange = new EventEmitter<JQLUpdateEvent>();
    public get onDidJQLChange(): Event<JQLUpdateEvent> {
        return this._onDidJQLChange.event;
    }

    constructor() {
        super(() => this.dispose());

        this._disposable = Disposable.from(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
    }

    dispose() {
        this._disposable.dispose();
        this._onDidJQLChange.dispose();
    }

    public async updateFilters() {
        const allList = Container.config.jira.jqlList;
        if (!allList) {
            return;
        }

        const filterList = allList.filter(item => item.filterId);

        await Promise.all(filterList.map(
            async f => {
                const site = Container.siteManager.getSiteForId(ProductJira, f.siteId);
                if (site) {
                    try {
                        const client = await Container.clientManager.jiraClient(site);
                        const updatedFilter = await client.getFilter(f.filterId!);
                        if (updatedFilter) {
                            const originalFilter = allList.find(of => of.id === f.id);
                            if (originalFilter) {
                                originalFilter.name = updatedFilter.name;
                                originalFilter.query = updatedFilter.jql;
                            }
                        }
                    } catch (e) {
                        Logger.error(e, `Error fetching filter "${f.name}"`);
                    }
                }
            }
        ));

        configuration.updateEffective('jira.jqlList', allList);
    }

    public notifiableJQLEntries(): JQLEntry[] {
        return Container.config.jira.jqlList.filter(entry => entry.enabled && entry.monitor);
    }

    public enabledJQLEntries(): JQLEntry[] {
        return Container.config.jira.jqlList.filter(entry => entry.enabled);
    }

    public initializeJQL(site: DetailedSiteInfo) {
        configuration.update('jira.jqlList', [{
            id: v4(),
            enabled: true,
            name: `My ${site.name} Issues`,
            query: 'assignee = currentUser() ORDER BY lastViewed DESC ',
            siteId: site.id,
            monitor: true,
        }], ConfigurationTarget.Global);
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        if (configuration.changed(e, 'jira.filterList')) {
            this.updateFilters();
        }
    }
}
