
import { JiraIssueWebview } from './jiraIssueWebview';
import { AbstractMultiViewManager } from './multiViewManager';
import { Issue } from '../jira/jiraModel';

// JiraIssueViewManager manages views for issue details.
export class JiraIssueViewManager extends AbstractMultiViewManager<Issue> {

    dataKey(data: Issue): string {
        return data.key;

    }

    createView(extensionPath: string) {
        return new JiraIssueWebview(extensionPath);
    }

}