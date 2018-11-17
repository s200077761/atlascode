import { AbstractIssueTree } from "./abstractIssueTree";
import { AssignedIssuesTreeId } from "../../constants";
import { Container } from "../../container";
import { ConfigurationChangeEvent } from "vscode";
import { configuration } from "../../config/configuration";

export class AssignedIssuesTree extends AbstractIssueTree {
    constructor() {
        super(AssignedIssuesTreeId,undefined,"You have no assigned issues");

        const project = Container.config.jira.workingProject;
        this.setJql(this.jqlForProject(project));
    }

    public async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if(!initializing && configuration.changed(e, 'jira.workingProject')) {
            const project = Container.config.jira.workingProject;

            const jql = project ? `assignee=currentUser() and project=${project} and statusCategory in ("In Progress")` : undefined;
            this.setJql(jql);
        }

        super.onConfigurationChanged(e);
    }

    private jqlForProject(project?:string): string {
        return project ? `assignee=currentUser() and project=${project} and statusCategory in ("In Progress")` : 'assignee=currentUser() and statusCategory in ("In Progress")';
    }
}