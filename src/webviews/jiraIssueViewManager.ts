
import { JiraIssueWebview } from './jiraIssueWebview';
import { AbstractMultiViewManager } from './multiViewManager';
import { IssueKeyAndSite } from '../jira/jira-client/model/entities';

// JiraIssueViewManager manages views for issue details.
export class JiraIssueViewManager extends AbstractMultiViewManager<IssueKeyAndSite> {

    dataKey(data: IssueKeyAndSite): string {
        return data.issueKey;

    }

    createView(extensionPath: string) {
        return new JiraIssueWebview(extensionPath);
    }

}