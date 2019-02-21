import { Disposable, ConfigurationChangeEvent, EventEmitter, Event } from "vscode";
import { Container } from "../container";
import { configuration, emptyWorkingSite, WorkingSite, WorkingProject, emptyWorkingProject, notEmptyProject, isEmptySite } from "../config/configuration";
import { AuthInfoEvent } from "../atlclients/authStore";
import { AccessibleResource, AuthProvider } from "../atlclients/authInfo";
import { Project, isProject, projectFromJsonObject } from "./jiraModel";
import { Logger } from "../logger";


export type JiraSiteUpdateEvent = {
    sites: AccessibleResource[];
    projects: Project[];
};

type OrderBy = "category" | "-category" | "+category" | "key" | "-key" | "+key" | "name" | "-name" | "+name" | "owner" | "-owner" | "+owner";
export class JiraSiteManager extends Disposable {
    private _disposable: Disposable;
    private _sitesAvailable: AccessibleResource[] = [];
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

        void this.onConfigurationChanged(configuration.initializingChangeEvent);

    }

    dispose() {
        this._disposable.dispose();
        this._onDidSiteChange.dispose();
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'jira.workingSite')) {
            this._projectsAvailable = [];

            if (await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
                await this.getProjects().then(projects => {
                    this._projectsAvailable = projects;
                });
            }

            this._onDidSiteChange.fire({ sites: this._sitesAvailable, projects: this._projectsAvailable });
        }
    }

    async onDidAuthChange(e: AuthInfoEvent) {
        this._sitesAvailable = [];
        this._projectsAvailable = [];
        if (e.provider === AuthProvider.JiraCloud && e.authInfo && e.authInfo.accessibleResources) {
            this._sitesAvailable = e.authInfo.accessibleResources;

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
            const ai = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);

            if (ai && ai.accessibleResources) {
                this._sitesAvailable = ai.accessibleResources;
            }
        }

        return this._sitesAvailable;
    }

    public get effectiveSite(): WorkingSite {
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