import { Disposable, ConfigurationChangeEvent, EventEmitter, Event } from "vscode";
import { Container } from "../container";
import { configuration, emptyWorkingSite, WorkingProject, emptyWorkingProject, notEmptyProject, isEmptySite, Configuration } from "../config/configuration";
import { AuthInfoEvent } from "../atlclients/authStore";
import { AccessibleResource, AuthProvider } from "../atlclients/authInfo";
import { Project, isProject, projectFromJsonObject } from "./jiraModel";
import { Logger } from "../logger";
import { JiraWorkingSiteConfigurationKey } from "../constants";


export type JiraSiteUpdateEvent = {
    sites: AccessibleResource[];
    projects: Project[];
};

type OrderBy = "category" | "-category" | "+category" | "key" | "-key" | "+key" | "name" | "-name" | "+name" | "owner" | "-owner" | "+owner";
export class JiraSiteManager extends Disposable {
    private _disposable: Disposable;
    private _sitesAvailable: AccessibleResource[] = [];
    private _prodSitesAvailable: AccessibleResource[] = [];
    private _stagingSitesAvailable: AccessibleResource[] = [];
    private _projectsAvailable: Project[] = [];

    private _onDidSiteChange = new EventEmitter<JiraSiteUpdateEvent>();
    public get onDidSiteChange(): Event<JiraSiteUpdateEvent> {
        return this._onDidSiteChange.event;
    }

    constructor() {
        super(() => this.dispose());

        this._disposable = Disposable.from(
            Container.authManager.onDidAuthChange(this.onDidAuthChange, this),
            configuration.onDidChange(this.onConfigurationChanged, this)
        );

        void this.onConfigurationChanged(Configuration.initializingChangeEvent);

    }

    dispose() {
        this._disposable.dispose();
        this._onDidSiteChange.dispose();
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = Configuration.initializing(e);

        if (initializing || Configuration.changed(e, JiraWorkingSiteConfigurationKey)) {
            this._projectsAvailable = [];

            await this.getProjects().then(projects => {
                this._projectsAvailable = projects;
            });

            this._onDidSiteChange.fire({ sites: this._sitesAvailable, projects: this._projectsAvailable });
        }
    }

    async onDidAuthChange(e: AuthInfoEvent) {
        this._projectsAvailable = [];

        switch (e.provider) {
            case AuthProvider.JiraCloud: {
                this._prodSitesAvailable = [];
                if (e.authInfo && e.authInfo.accessibleResources) {
                    this._prodSitesAvailable = e.authInfo.accessibleResources;
                }
                break;
            }
            case AuthProvider.JiraCloudStaging: {
                this._stagingSitesAvailable = [];
                if (e.authInfo && e.authInfo.accessibleResources) {
                    this._stagingSitesAvailable = e.authInfo.accessibleResources;
                }
                break;
            }
        }

        if (e.provider === AuthProvider.JiraCloud || e.provider === AuthProvider.JiraCloudStaging) {
            this._sitesAvailable = this._prodSitesAvailable.concat(this._stagingSitesAvailable);

            await this.getProjects().then(projects => {
                this._projectsAvailable = projects;
            });

            this._onDidSiteChange.fire({ sites: this._sitesAvailable, projects: this._projectsAvailable });
        }
    }

    async getProjects(orderBy?: OrderBy, query?: string): Promise<Project[]> {
        if (this._projectsAvailable.length > 0 && query === undefined) {
            return this._projectsAvailable;
        }

        // don't force auth
        if (await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
            let client = await Container.clientManager.jirarequest();

            if (client) {
                const order = orderBy !== undefined ? orderBy : 'key';
                return client.project
                    .getProjectsPaginated({ orderBy: order, query: query })
                    .then((res: JIRA.Response<JIRA.Schema.PageBeanProjectBean>) => {
                        return this.readProjects(res.data.values);
                    });
            } else {
                Logger.debug("sitemanager couldn't get a client");
            }
        }

        return [];
    }

    private readProjects(projects: JIRA.Schema.ProjectBean[] | undefined): Project[] {

        if (projects) {
            return projects
                .filter(project => isProject(project))
                .map(project => projectFromJsonObject(project));
        }

        return [];
    }

    public async getSitesAvailable() {
        if (this._sitesAvailable.length < 1) {

            this._sitesAvailable = [];
            this._prodSitesAvailable = [];
            this._stagingSitesAvailable = [];

            const ai = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);

            if (ai && ai.accessibleResources) {
                this._prodSitesAvailable = ai.accessibleResources;
            }

            const ais = await Container.authManager.getAuthInfo(AuthProvider.JiraCloudStaging);

            if (ais && ais.accessibleResources) {
                this._stagingSitesAvailable = ais.accessibleResources;
            }

            this._sitesAvailable = this._prodSitesAvailable.concat(this._stagingSitesAvailable);
        }

        return this._sitesAvailable;
    }

    public get effectiveSite(): AccessibleResource {
        let workingSite = emptyWorkingSite;
        const configSite = Container.config.jira.workingSite;

        if (configSite && !isEmptySite(configSite)) {
            workingSite = configSite;
        } else if (this._sitesAvailable.length > 0) {
            workingSite = this._sitesAvailable[0];
        }

        return workingSite;
    }

    public get workingProjectOrEmpty(): WorkingProject {
        let workingProject = emptyWorkingProject;
        const configProject = Container.config.jira.workingProject;

        if (configProject && notEmptyProject(configProject)) {
            workingProject = configProject;
        }

        return workingProject;
    }

    public async getEffectiveProject(): Promise<WorkingProject> {
        let workingProject = emptyWorkingProject;
        const configProject = Container.config.jira.workingProject;

        if (configProject && notEmptyProject(configProject)) {
            workingProject = configProject;
        } else {
            const projects = await this.getProjects();
            if (projects.length > 0) {
                workingProject = projects[0];
            }
        }

        return workingProject;
    }
}