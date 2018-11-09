import { JiraOutlineProvider } from '../views/jira/jiraOutlineProvider';

export interface JiraContext {
    assignedTree: JiraOutlineProvider;
    openTree: JiraOutlineProvider;
}
