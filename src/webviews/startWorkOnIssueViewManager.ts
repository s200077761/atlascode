
import { AbstractMultiViewManager } from './multiViewManager';
import { issueOrKey, isIssue } from '../jira/jiraModel';
import { StartWorkOnIssueWebview } from './startWorkOnIssueWebview';

export class StartWorkOnIssueViewManager extends AbstractMultiViewManager<issueOrKey> {

    dataKey(data: issueOrKey): string {
        return isIssue(data) ? data.key : data;
    }

    createView(extensionPath: string) {
        return new StartWorkOnIssueWebview(extensionPath);
    }

}