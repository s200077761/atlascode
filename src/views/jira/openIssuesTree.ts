import { AbstractIssueTree } from "./abstractIssueTree";
import { OpenIssuesTreeId } from "../../constants";
import { Container } from "../../container";
import { ConfigurationChangeEvent } from "vscode";
import { configuration } from "../../config/configuration";

export class OpenIssuesTree extends AbstractIssueTree {
    constructor() {
        super(OpenIssuesTreeId, undefined, `There are no open issues for '${Container.config.jira.workingProject.name}' project in '${Container.jiraSiteManager.effectiveSite.name}' site`);

        const project = Container.config.jira.workingProject;
        this.setJql(this.jqlForProject(project.id));
    }

    public async onConfigurationChanged(e: ConfigurationChangeEvent) {
        super.onConfigurationChanged(e);
        const initializing = configuration.initializing(e);

        if (!initializing && (configuration.changed(e, 'jira.workingProject') || configuration.changed(e, 'jira.workingSite'))) {
            const project = await Container.jiraSiteManager.getEffectiveProject();
            this.setEmptyState(`There are no open issues for '${project.name}' project in '${Container.jiraSiteManager.effectiveSite.name}' site`);
            this.setJql(this.jqlForProject(project.id));
        }

    }

    private jqlForProject(project?: string): string {
        return project
            ? `assignee in (EMPTY) and project=${project} and resolution = Unresolved and statusCategory != Done order by lastViewed DESC`
            : 'assignee in (EMPTY) and resolution = Unresolved and statusCategory != Done order by lastViewed DESC';
    }
}