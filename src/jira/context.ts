import { JiraOutlineProvider } from '../views/jira/jiraOutlineProvider';

export class JiraContext {
    assignedTree: JiraOutlineProvider;
    openTree: JiraOutlineProvider;

    constructor(assignedTree: JiraOutlineProvider, openTree: JiraOutlineProvider) {
        this.assignedTree = assignedTree;
        this.openTree = openTree;
    }
}
