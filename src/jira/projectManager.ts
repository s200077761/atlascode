import { Disposable, ConfigurationChangeEvent, EventEmitter, Event } from "vscode";
import { Container } from "../container";
import { configuration } from "../config/configuration";
import { ProductJira, DetailedSiteInfo } from "../atlclients/authInfo";
import { JiraDefaultProjectsConfigurationKey } from "../constants";
import { Project } from "./jira-client/model/entities";
import { Logger } from "../logger";
import pAny from "p-any";
import pTimeout from "p-timeout";
import { Time } from "../util/time";


export type JiraSiteProjectMappingUpdateEvent = {
    projectSiteMapping: JiraSiteProjectMapping;
};

export type JiraSiteProjectMapping = { [key: string]: Project };

type OrderBy = "category" | "-category" | "+category" | "key" | "-key" | "+key" | "name" | "-name" | "+name" | "owner" | "-owner" | "+owner";
export class JiraProjectManager extends Disposable {
    private _disposable: Disposable;
    private _projectSiteMapping: JiraSiteProjectMapping;

    private _onDidSiteProjectMappingChange = new EventEmitter<JiraSiteProjectMappingUpdateEvent>();
    public get onDidSiteProjectMappingChange(): Event<JiraSiteProjectMappingUpdateEvent> {
        return this._onDidSiteProjectMappingChange.event;
    }

    constructor() {
        super(() => this.dispose());

        this._disposable = Disposable.from(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );

        this._projectSiteMapping = {};
        void this.onConfigurationChanged(configuration.initializingChangeEvent);

    }

    dispose() {
        this._disposable.dispose();
        this._onDidSiteProjectMappingChange.dispose();
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, JiraDefaultProjectsConfigurationKey)) {
            await this.updateSiteProjectMapping();
            this._onDidSiteProjectMappingChange.fire({ projectSiteMapping: this._projectSiteMapping });
        }
    }

    private async updateSiteProjectMapping(): Promise<void> {
        for (let siteId in Container.config.jira.defaultProjects) {
            const configProjectKey = Container.config.jira.defaultProjects[siteId];
            const currentProject = this._projectSiteMapping[siteId];

            if (!currentProject || currentProject.key !== configProjectKey) {
                const site = Container.siteManager.getSiteForId(ProductJira, siteId);
                if (site) {
                    const client = await Container.clientManager.jiraClient(site);
                    const project = await client.getProject(configProjectKey);
                    this._projectSiteMapping[siteId] = project;
                }
            }
        }
    }

    public async getSiteProjectMapping(): Promise<JiraSiteProjectMapping> {
        if (Object.keys(this._projectSiteMapping).length < 1) {
            for (let siteId in Container.config.jira.defaultProjects) {
                const site = Container.siteManager.getSiteForId(ProductJira, siteId);
                if (site) {
                    const client = await Container.clientManager.jiraClient(site);
                    const project = await client.getProject(Container.config.jira.defaultProjects[siteId]);
                    this._projectSiteMapping[siteId] = project;
                }
            }
        }

        return this._projectSiteMapping;
    }

    public async findSiteForProjectKey(projectKey: string): Promise<DetailedSiteInfo> {
        const emptyPromises: Promise<DetailedSiteInfo>[] = [];

        Container.siteManager.getSitesAvailable(ProductJira).forEach(site => {
            emptyPromises.push(
                (async () => {
                    const client = await Container.clientManager.jiraClient(site);
                    if (client) {
                        const project = await client.getProject(projectKey);
                        if (project.key === projectKey) {
                            return site;
                        }
                    }
                    return Promise.reject('project not found');
                })()
            );
        });
        const promise = pAny(emptyPromises);

        const foundSite = await pTimeout(promise, 1 * Time.MINUTES).catch(() => undefined);
        return (foundSite) ? foundSite : Promise.reject(`no site found with project key ${projectKey}`);
    }

    async getProjects(site: DetailedSiteInfo, orderBy?: OrderBy, query?: string): Promise<Project[]> {
        let foundProjects: Project[] = [];

        try {
            const client = await Container.clientManager.jiraClient(site);
            const order = orderBy !== undefined ? orderBy : 'key';
            foundProjects = await client.getProjects(query, order);

        } catch (e) {
            Logger.debug(`Failed to fetch projects ${e}`);
        }

        return foundProjects;
    }
}
