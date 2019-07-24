import { Disposable, ConfigurationChangeEvent, EventEmitter, Event } from "vscode";
import { Container } from "../container";
import { configuration, WorkingProject, emptyWorkingProject, notEmptyProject } from "../config/configuration";
import { ProductJira } from "../atlclients/authInfo";
import { Project, isProject, projectFromJsonObject } from "./jiraModel";
import { JiraDefaultSiteConfigurationKey } from "../constants";
import { Logger } from "../logger";


export type JiraAvailableProjectsUpdateEvent = {
    projects: Project[];
};

type OrderBy = "category" | "-category" | "+category" | "key" | "-key" | "+key" | "name" | "-name" | "+name" | "owner" | "-owner" | "+owner";
export class JiraProjectManager extends Disposable {
    private _disposable: Disposable;
    private _projectsAvailable: Project[] = [];

    private _onDidProjectsAvailableChange = new EventEmitter<JiraAvailableProjectsUpdateEvent>();
    public get onDidProjectsAvailableChange(): Event<JiraAvailableProjectsUpdateEvent> {
        return this._onDidProjectsAvailableChange.event;
    }

    constructor() {
        super(() => this.dispose());

        this._disposable = Disposable.from(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );

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

    async getProjects(orderBy?: OrderBy, query?: string): Promise<Project[]> {
        if (this._projectsAvailable.length > 0 && query === undefined) {
            return this._projectsAvailable;
        }

        const client = await Container.clientManager.jirarequest(Container.siteManager.effectiveSite(ProductJira));
        const order = orderBy !== undefined ? orderBy : 'key';
        Logger.debug('calling getProjectsPaginated');
        const resp = await client.getProjectsPaginated(query, order);
        Logger.debug('got response', resp);
        this._projectsAvailable = resp;

        return this._projectsAvailable;
    }

    public static readProjects(projects: any[] | undefined): Project[] {

        if (projects) {
            return projects
                .filter(project => isProject(project))
                .map(project => projectFromJsonObject(project));
        }

        return [];
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