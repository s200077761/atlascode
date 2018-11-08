
import {  JiraIssueWebview } from './jiraIssueWebview';
import { AbstractMultiViewManager } from './multiViewManager';
import { JiraIssue } from '../jira/jiraIssue';

// JiraIssueViewManager manages views for issue details.
export class JiraIssueViewManager extends AbstractMultiViewManager<JiraIssue.issueOrKey> {

    dataKey(data: JiraIssue.issueOrKey): string {
        return JiraIssue.isIssue(data) ? data.key : data;
        
    }

    createView(extensionPath: string) {
        return new JiraIssueWebview(extensionPath);
    }

}