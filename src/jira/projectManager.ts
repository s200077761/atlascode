import { Disposable, ConfigurationChangeEvent, EventEmitter, Event } from "vscode";
import { Container } from "../container";
import { configuration } from "../config/configuration";
import { ProductJira, DetailedSiteInfo } from "../atlclients/authInfo";
import { JiraDefaultSiteConfigurationKey } from "../constants";
import { Project } from "./jira-client/model/entities";
import { Logger } from "../logger";
import { emptyProject, isEmptyProject } from "./jira-client/model/emptyEntities";


export type JiraAvailableProjectsUpdateEvent = {
    projects: Project[];
};

export type JiraSiteProjectMapping = { [key: string]: Project };

type OrderBy = "category" | "-category" | "+category" | "key" | "-key" | "+key" | "name" | "-name" | "+name" | "owner" | "-owner" | "+owner";
export class JiraProjectManager extends Disposable {
    private _disposable: Disposable;
    private _projectsAvailable: Project[] = [];
    private _projectSiteMapping: JiraSiteProjectMapping;

    private _onDidProjectsAvailableChange = new EventEmitter<JiraAvailableProjectsUpdateEvent>();
    public get onDidProjectsAvailableChange(): Event<JiraAvailableProjectsUpdateEvent> {
        return this._onDidProjectsAvailableChange.event;
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
        this._onDidProjectsAvailableChange.dispose();
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, JiraDefaultSiteConfigurationKey)) {
            this._projectsAvailable = [];

            await this.getProjects().then(projects => {
                this._projectsAvailable = projects;
            });

            this._onDidProjectsAvailableChange.fire({ projects: this._projectsAvailable });
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

    async getProjects(site?: DetailedSiteInfo, orderBy?: OrderBy, query?: string): Promise<Project[]> {
        const defaultSite: DetailedSiteInfo = Container.siteManager.effectiveSite(ProductJira);
        let foundProjects: Project[] = [];
        if (this._projectsAvailable.length > 0 && query === undefined && (!site || site.id === defaultSite.id)) {
            return this._projectsAvailable;
        }

        try {
            const useSite: DetailedSiteInfo = (site) ? site : defaultSite;
            const client = await Container.clientManager.jiraClient(useSite);
            const order = orderBy !== undefined ? orderBy : 'key';
            foundProjects = await client.getProjects(query, order);

            if (!site || site.id === defaultSite.id) {
                this._projectsAvailable = foundProjects;
            }

        } catch (e) {
            Logger.debug(`Failed to fetch projects ${e}`);
        }

        return foundProjects;
    }

    public async getEffectiveProject(site?: DetailedSiteInfo): Promise<Project> {
        let defaultProject = emptyProject;
        const configProjects = Container.config.jira.defaultProjects;
        const currentSite: DetailedSiteInfo = (site) ? site : Container.siteManager.effectiveSite(ProductJira);

        if (this._projectSiteMapping[currentSite.id]) {
            return this._projectSiteMapping[currentSite.id];
        }

        // check to see if project is configured for site
        if (configProjects[currentSite.id]) {
            const client = await Container.clientManager.jiraClient(currentSite);
            defaultProject = await client.getProject(configProjects[currentSite.id]);

        } else {
            const projects = await this.getProjects();
            if (projects.length > 0) {
                defaultProject = projects[0];
            }
        }

        if (!isEmptyProject(defaultProject)) {
            this._projectSiteMapping[currentSite.id] = defaultProject;
        }

        return defaultProject;
    }
}
