
import { AbstractMultiViewManager } from './multiViewManager';
import { issueOrKey } from '../jira/jiraModel';
import { StartWorkOnIssueWebview } from './startWorkOnIssueWebview';

export class StartWorkOnIssueViewManager extends AbstractMultiViewManager<issueOrKey> {

    dataKey(data: issueOrKey): string {
        return 'startWorkOnIssueDataKey';
    }

    createView(extensionPath: string) {
        return new StartWorkOnIssueWebview(extensionPath);
    }

}