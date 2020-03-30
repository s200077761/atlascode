import { AnalyticsApi } from '../../lib/analyticsApi';
import { BitbucketIssueActionApi } from '../../lib/webview/controller/bbIssue/bitbucketIssueActionApi';

export class VSCBitbucketIssueActionApi implements BitbucketIssueActionApi {
    private _analyticsApi: AnalyticsApi;

    constructor(analyticsApi: AnalyticsApi) {
        this._analyticsApi = analyticsApi;
        console.log(this._analyticsApi);
    }
}
