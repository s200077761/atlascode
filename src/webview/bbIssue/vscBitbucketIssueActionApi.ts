import axios, { CancelToken } from 'axios';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketIssue, Comment, User } from '../../bitbucket/model';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { BitbucketIssueActionApi } from '../../lib/webview/controller/bbIssue/bitbucketIssueActionApi';

export class VSCBitbucketIssueActionApi implements BitbucketIssueActionApi {
    private _analyticsApi: AnalyticsApi;

    constructor(analyticsApi: AnalyticsApi) {
        this._analyticsApi = analyticsApi;
        console.log(this._analyticsApi);
    }

    async currentUser(issue: BitbucketIssue): Promise<User> {
        const bbApi = await clientForSite(issue.site);
        return await bbApi.pullrequests.getCurrentUser(issue.site.details);
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

    async postComment(issue: BitbucketIssue, content: string): Promise<Comment> {
        const bbApi = await clientForSite(issue.site);
        return await bbApi.issues!.postComment(issue, content);
    }

    async updateStatus(issue: BitbucketIssue, status: string): Promise<[string, Comment]> {
        const bbApi = await clientForSite(issue.site);
        return await bbApi.issues!.postChange(issue, status);
    }

    async fetchUsers(issue: BitbucketIssue, query: string, abortSignal?: AbortSignal): Promise<User[]> {
        const bbApi = await clientForSite(issue.site);

        var cancelToken: CancelToken | undefined = undefined;

        if (abortSignal) {
            const cancelSignal = axios.CancelToken.source();
            cancelToken = cancelSignal.token;
            abortSignal.onabort = () => cancelSignal.cancel('bitbucket issue fetch users request aborted');
        }
        return await bbApi.pullrequests.getReviewers(issue.site, query, cancelToken);
    }

    async assign(issue: BitbucketIssue, accountId?: string): Promise<[User, Comment]> {
        const bbApi = await clientForSite(issue.site);
        return await bbApi.issues!.assign(issue, accountId);
    }
}
