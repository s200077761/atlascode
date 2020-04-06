import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketIssue, Comment } from '../../bitbucket/model';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { BitbucketIssueActionApi } from '../../lib/webview/controller/bbIssue/bitbucketIssueActionApi';

export class VSCBitbucketIssueActionApi implements BitbucketIssueActionApi {
    private _analyticsApi: AnalyticsApi;

    constructor(analyticsApi: AnalyticsApi) {
        this._analyticsApi = analyticsApi;
        console.log(this._analyticsApi);
    }

    async getIssue(issue: BitbucketIssue): Promise<BitbucketIssue> {
        const bbApi = await clientForSite(issue.site);

        return bbApi.issues!.refetch(issue);
    }

    async getComments(issue: BitbucketIssue): Promise<Comment[]> {
        const bbApi = await clientForSite(issue.site);
        const [comments, changes] = await Promise.all([
            bbApi.issues!.getComments(issue),
            bbApi.issues!.getChanges(issue)
        ]);

        // replace comment with change data which contains additional details
        const updatedComments = comments.data.map(
            comment => changes.data.find(change => change.id! === comment.id!) || comment
        );

        return updatedComments;
    }

    async updateStatus(issue: BitbucketIssue, status: string) {
        const bbApi = await clientForSite(issue.site);
        await bbApi.issues!.postChange(issue, status, issue.data.content.raw);
    }
}
