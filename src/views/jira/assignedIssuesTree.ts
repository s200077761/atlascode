import { AbstractIssueTree } from "./abstractIssueTree";
import { AssignedIssuesTreeId } from "../../constants";
import { Container } from "../../container";
import { ConfigurationChangeEvent } from "vscode";
import { configuration } from "../../config/configuration";

export class AssignedIssuesTree extends AbstractIssueTree {
    constructor() {
        super(AssignedIssuesTreeId, undefined, `You have no assigned issues for '${Container.config.jira.workingProject.name}' project in '${Container.jiraSiteManager.effectiveSite.name}' site`);

        const project = Container.config.jira.workingProject;
        this.setJql(this.jqlForProject(project.id));
    }

    public async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);
        if (!initializing && (configuration.changed(e, 'jira.workingProject') || configuration.changed(e, 'jira.workingSite'))) {
            const project = await Container.jiraSiteManager.getEffectiveProject();

            this.setEmptyState(`You have no assigned issues for '${project.name}' project in '${Container.jiraSiteManager.effectiveSite.name}' site`);
            this.setJql(this.jqlForProject(project.id));
        }

        super.onConfigurationChanged(e);
    }

    private jqlForProject(project?: string): string {
        return project
            ? `assignee=currentUser() and project=${project} and resolution = Unresolved and statusCategory != Done`
            : 'assignee=currentUser() and resolution = Unresolved and statusCategory != Done';
    }
}