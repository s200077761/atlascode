
import { PullRequestWebview } from './pullRequestWebview';
import { AbstractMultiViewManager } from './multiViewManager';
import { PullRequest } from '../bitbucket/model';

// PullRequestViewManager manages views for PR details.
export class PullRequestViewManager extends AbstractMultiViewManager<PullRequest> {

    dataKey(data: PullRequest): string {
        return data.data.url;
    }

    createView(extensionPath: string) {
        return new PullRequestWebview(extensionPath);
    }

}