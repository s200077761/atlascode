import { AbstractIssueTree } from "./abstractIssueTree";
import { AssignedIssuesTreeId } from "../../constants";
import { Container } from "../../container";
import { ConfigurationChangeEvent } from "vscode";
import { configuration } from "../../config/configuration";
import { Logger } from "../../logger";

export class AssignedIssuesTree extends AbstractIssueTree {
    constructor() {
        super(AssignedIssuesTreeId,undefined,"You have no assigned issues");

        const project = Container.config.jira.workingProject;
        this.setJql(this.jqlForProject(project.id));
    }

    public async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);
        Logger.debug("AssignedIssuesTree got config change",configuration.changed(e, 'jira.workingProject'));
        if(!initializing && (configuration.changed(e, 'jira.workingProject') || configuration.changed(e, 'jira.workingSite'))) {
            const project = await Container.jiraSiteManager.getEffectiveProject();

            this.setJql(this.jqlForProject(project.id));
        }

        super.onConfigurationChanged(e);
    }

    private jqlForProject(project?:string): string {
        return project ? `assignee=currentUser() and project=${project} and resolution = Unresolved` : 'assignee=currentUser() and resolution = Unresolved';
    }
}