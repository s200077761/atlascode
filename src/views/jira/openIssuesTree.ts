import { AbstractIssueTree } from "./abstractIssueTree";
import { OpenIssuesTreeId } from "../../constants";
import { Container } from "../../container";
import { ConfigurationChangeEvent } from "vscode";
import { configuration } from "../../config/configuration";
import { Logger } from "../../logger";

export class OpenIssuesTree extends AbstractIssueTree {
    constructor() {
        super(OpenIssuesTreeId,undefined,"There are no open issues");

        const project = Container.config.jira.workingProject;
        this.setJql(this.jqlForProject(project));
    }

    public async onConfigurationChanged(e: ConfigurationChangeEvent) {
        super.onConfigurationChanged(e);
        const initializing = configuration.initializing(e);
        Logger.debug("OpenIssuesTree got config change",e);
        
        if(!initializing && configuration.changed(e, 'jira.workingProject')) {
            const project = Container.config.jira.workingProject;
            Logger.debug("OpenIssuesTree jira.workingProject change",Container.config);
            const jql = project ? `assignee in (EMPTY) and project=${project} order by lastViewed DESC` : undefined;
            this.setJql(jql);
        }

    }

    private jqlForProject(project?:string): string {
        return project ? `assignee in (EMPTY) and project=${project} order by lastViewed DESC` : 'assignee in (EMPTY) order by lastViewed DESC';
    }
}