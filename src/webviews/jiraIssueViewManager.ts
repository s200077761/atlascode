
import { JiraIssueWebview } from './jiraIssueWebview';
import { AbstractMultiViewManager } from './multiViewManager';
import { MinimalIssue } from '../jira/jira-client/model/entities';

// JiraIssueViewManager manages views for issue details.
export class JiraIssueViewManager extends AbstractMultiViewManager<MinimalIssue> {

    dataKey(data: MinimalIssue): string {
        return data.key;

    }

    createView(extensionPath: string) {
        return new JiraIssueWebview(extensionPath);
    }

}