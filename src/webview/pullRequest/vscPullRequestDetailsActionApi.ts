import { AnalyticsApi } from '../../lib/analyticsApi';
import { PullRequestDetailsActionApi } from '../../lib/webview/controller/pullrequest/pullRequestDetailsActionApi';

export class VSCPullRequestDetailsActionApi implements PullRequestDetailsActionApi {
    private analyticsApi: AnalyticsApi;

    constructor(analyticsApi: AnalyticsApi) {
        this.analyticsApi = analyticsApi;

        //This needs to be here temporarily so that the compiler doesn't complain analyticsApi is unused.
        console.log(this.analyticsApi);
    }
}
