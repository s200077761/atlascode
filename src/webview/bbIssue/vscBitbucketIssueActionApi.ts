import { AnalyticsApi } from '../../lib/analyticsApi';
import { FeedbackData, FeedbackUser } from '../../lib/ipc/models/common';
import { BitbucketIssueActionApi } from '../../lib/webview/controller/bbIssue/bitbucketIssueActionApi';
import { getFeedbackUser, submitFeedback } from '../../webviews/feedbackSubmitter';

export class VSCBitbucketIssueActionApi implements BitbucketIssueActionApi {
    private _analyticsApi: AnalyticsApi;

    constructor(analyticsApi: AnalyticsApi) {
        this._analyticsApi = analyticsApi;
    }

    public async submitFeedback(feedback: FeedbackData, source: string): Promise<void> {
        submitFeedback(feedback, source);
        console.log(this._analyticsApi);
    }

    public async getFeedbackUser(): Promise<FeedbackUser> {
        return await getFeedbackUser();
    }
}
