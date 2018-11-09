
import {  JiraIssueWebview } from './jiraIssueWebview';
import { AbstractMultiViewManager } from './multiViewManager';
import { issueOrKey, isIssue } from '../jira/jiraModel';

// JiraIssueViewManager manages views for issue details.
export class JiraIssueViewManager extends AbstractMultiViewManager<issueOrKey> {

    dataKey(data: issueOrKey): string {
        return isIssue(data) ? data.key : data;
        
    }

    createView(extensionPath: string) {
        return new JiraIssueWebview(extensionPath);
    }

}