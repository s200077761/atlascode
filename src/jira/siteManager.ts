import { Disposable, ConfigurationChangeEvent, EventEmitter, Event } from "vscode";
import { Container } from "../container";
import { configuration, emptyWorkingSite, WorkingSite, WorkingProject, emptyWorkingProject } from "../config/configuration";
import { AuthInfoEvent } from "../atlclients/authStore";
import { AccessibleResource, AuthProvider } from "../atlclients/authInfo";
import { Project, isProject, projectFromJsonObject } from "./jiraModel";
import { Logger } from "../logger";


export type JiraSiteUpdateEvent = {
    sites: AccessibleResource[];
    projects: Project[];
};

export class JiraSiteManager extends Disposable {
    private _disposable:Disposable;
    private _sitesAvailable:AccessibleResource[] = [];
    private _projectsAvailable:Project[] = [];

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

        if(initializing || configuration.changed(e, 'jira.workingSite')) {
            this._projectsAvailable = [];

            if(await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)){
                Logger.debug('site manager got config change', Container.authManager.isAuthenticated(AuthProvider.JiraCloud));
                await this.getProjects().then(projects => {
                    this._projectsAvailable = projects;
                });
            }
            
            this._onDidSiteChange.fire({ sites: this._sitesAvailable, projects: this._projectsAvailable });
        }
    }

    async onDidAuthChange(e:AuthInfoEvent) {
        this._sitesAvailable = [];
        this._projectsAvailable = [];
        if(e.provider === AuthProvider.JiraCloud && e.authInfo && e.authInfo.accessibleResources) {
            Logger.debug('site manager got auth change', e.authInfo);
            this._sitesAvailable = e.authInfo.accessibleResources;

            await this.getProjects().then(projects => {
                this._projectsAvailable = projects;
            });

            this._onDidSiteChange.fire({ sites: this._sitesAvailable, projects: this._projectsAvailable });
        }
    }

    async getProjects(): Promise<Project[]> {
        if(this._projectsAvailable.length > 0) {
            return this._projectsAvailable;
        }

        Logger.debug('site manager is calling jirarequest');
        let client = await Container.clientManager.jirarequest();
      
        if (client) {
          return client.project
            .getProjectsPaginated({})
            .then((res: JIRA.Response<JIRA.Schema.PageBeanProjectBean>) => {
              return this.readProjects(res.data.values);
            });
        } else {
            Logger.debug("sitemanager couldn't get a client");
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
        if(this._sitesAvailable.length < 1) {
            const ai = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);

            if(ai && ai.accessibleResources) {
                this._sitesAvailable = ai.accessibleResources;
            }
        }

        return this._sitesAvailable;
    }

    public get effectiveSite():WorkingSite {
        let workingSite = emptyWorkingSite;
        const configSite = Container.config.jira.workingSite;

        if(configSite && configSite !== emptyWorkingSite) {
            workingSite = configSite;
        } else if(this._sitesAvailable.length > 0) {
            workingSite = this._sitesAvailable[0];
        }

        return workingSite;
    }

    public get effectiveProject():WorkingProject {
        let workingProject = emptyWorkingProject;
        const configProject = Container.config.jira.workingProject;

        if(configProject) {
            workingProject = configProject;
        }

        return workingProject;
    }
}