
import { JiraIssueWebview } from './jiraIssueWebview';
import { AbstractMultiViewManager } from './multiViewManager';

// JiraIssueViewManager manages views for issue details.
export class JiraIssueViewManager extends AbstractMultiViewManager<string> {

    dataKey(data: string): string {
        return data;

    }

    createView(extensionPath: string) {
        return new JiraIssueWebview(extensionPath);
    }

}