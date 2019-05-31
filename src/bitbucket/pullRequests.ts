import * as gup from 'git-url-parse';
import { Repository, Remote } from "../typings/git";
import { PullRequest, PaginatedPullRequests, PaginatedCommits, PaginatedComments, PaginatedFileChanges, Reviewer } from './model';
import { Container } from "../container";
import { prCommentEvent } from '../analytics';

const bbHostClientMap = new Map()
    .set("bitbucket.org", async () => {
        const bb = await Container.clientManager.bbrequest();
        if (!bb) { return Promise.reject(apiConnectivityError); }
        return bb;
    })
    .set("bb-inf.net", async () => {
        const bb = await Container.clientManager.bbrequestStaging();
        if (!bb) { return Promise.reject(apiConnectivityError); }
        return bb;
    });
export const bitbucketHosts = {
    get: async (source: string): Promise<Bitbucket> => {
        if (bbHostClientMap.has(source)) {
            return await bbHostClientMap.get(source)();
        }
        return await bbHostClientMap.get('bitbucket.org')();
    },
    has: (source: string): boolean => {
        if (bbHostClientMap.has(source)) {
            return true;
        }
        if (source.includes('bitbucket.org')) {
            return true;
        }
        return false;
    }
};

export const maxItemsSupported = {
    commits: 100,
    comments: 100,
    reviewers: 100,
    buildStatuses: 100
};
export const defaultPagelen = 25;
const apiConnectivityError = new Error('cannot connect to bitbucket api');
const dummyRemote = { name: '', isReadOnly: true };

export function GitUrlParse(url: string): gup.GitUrl {
    return gup(url);
}

export namespace PullRequestApi {

    export async function getList(repository: Repository, queryParams?: { pagelen?: number, sort?: string, q?: string }): Promise<PaginatedPullRequests> {
        let remotes = getBitbucketRemotes(repository);

        for (let i = 0; i < remotes.length; i++) {
            let remote = remotes[i];
            let parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
            const bb = await bitbucketHosts.get(parsed.source);
            const { data } = await bb.repositories.listPullRequests({
                ...{
                    username: parsed.owner,
                    repo_slug: parsed.name,
                    pagelen: defaultPagelen
                },
                ...queryParams
            });
            const prs: PullRequest[] = data.values!.map((pr: Bitbucket.Schema.Pullrequest) => { return { repository: repository, remote: remote, data: pr }; });
            const next = data.next;
            // Handling pull requests from multiple remotes is not implemented. We stop when we see the first remote with PRs.
            if (prs.length > 0) {
                return { repository: repository, remote: remote, data: prs, next: next };
            }
        }

        return { repository: repository, remote: dummyRemote, data: [], next: undefined };
    }

    export async function getListCreatedByMe(repository: Repository): Promise<PaginatedPullRequests> {
        return PullRequestApi.getList(
            repository,
            { q: `state="OPEN" and author.account_id="${(await Container.bitbucketContext.currentUser()).accountId}"` });
    }

    export async function getListToReview(repository: Repository): Promise<PaginatedPullRequests> {
        return PullRequestApi.getList(
            repository,
            { q: `state="OPEN" and reviewers.account_id="${(await Container.bitbucketContext.currentUser()).accountId}"` });
    }

    export async function nextPage({ repository, remote, next }: PaginatedPullRequests): Promise<PaginatedPullRequests> {
        let parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
        const bb = await bitbucketHosts.get(parsed.source);
        const { data } = await bb.getNextPage({ next: next });
        //@ts-ignore
        const prs = (data as Bitbucket.Schema.Pullrequest).values!.map(pr => { return { repository: repository, remote: remote, data: pr }; });
        return { repository: repository, remote: remote, data: prs, next: data.next };
    }

    export async function getLatest(repository: Repository): Promise<PaginatedPullRequests> {
        return PullRequestApi.getList(
            repository,
            { pagelen: 1, sort: '-created_on', q: `state="OPEN" and reviewers.account_id="${(await Container.bitbucketContext.currentUser()).accountId}"` });
    }

    export async function getRecentAllStatus(repository: Repository): Promise<PaginatedPullRequests> {
        return PullRequestApi.getList(
            repository,
            { pagelen: 1, sort: '-created_on', q: 'state="OPEN" OR state="MERGED" OR state="SUPERSEDED" OR state="DECLINED"' });
    }

    export async function get(pr: PullRequest): Promise<PullRequest> {
        let parsed = GitUrlParse(pr.remote.fetchUrl! || pr.remote.pushUrl!);
        const bb = await bitbucketHosts.get(parsed.source);
        let { data } = await bb.repositories.getPullRequest({
            pull_request_id: pr.data.id!,
            repo_slug: parsed.name,
            username: parsed.owner
        });
        let sourceRemote: Remote | undefined = undefined;
        if (data.source!.repository!.links!.html!.href! !== data.destination!.repository!.links!.html!.href!) {
            sourceRemote = {
                fetchUrl: GitUrlParse(data.source!.repository!.links!.html!.href!).toString(parsed.protocol),
                name: data.source!.repository!.full_name!,
                isReadOnly: true
            };
        }
        return { repository: pr.repository, remote: pr.remote, sourceRemote: sourceRemote, data: data };
    }

    export async function getChangedFiles(pr: PullRequest): Promise<PaginatedFileChanges> {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source);
        let { data } = await bb.pullrequests.getDiffStat({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner
        });

        return data.values ? { data: data.values as Bitbucket.Schema.Diffstat[], next: data.next } : { data: [], next: undefined };
    }

    export async function getCommits(pr: PullRequest): Promise<PaginatedCommits> {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source);
        let { data } = await bb.pullrequests.listCommits({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.commits
        });

        return data.values ? { data: data.values, next: data.next } : { data: [], next: undefined };
    }

    export async function getComments(pr: PullRequest): Promise<PaginatedComments> {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source);
        let { data } = await bb.pullrequests.listComments({
            pull_request_id: pr.data.id!,
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.comments
        });

        if (!data.values) {
            return { data: [], next: undefined };
        }

        const accumulatedComments = data.values as Bitbucket.Schema.PullrequestComment[];
        while (data.next) {
            const nextPage = await bb.getNextPage({ next: data.next });
            data = nextPage.data;
            accumulatedComments.push(...(data.values || []));
        }

        const comments = accumulatedComments.map(c => {
            if (!c.deleted && c.content && c.content.raw && c.content.raw.trim().length > 0) {
                return c;
            }
            return {
                ...c,
                content: {
                    markup: 'markdown',
                    raw: '*Comment deleted*',
                    html: '<p><em>Comment deleted</em></p>'
                }
            } as Bitbucket.Schema.PullrequestComment;
        });
        return { data: comments, next: undefined };
    }

    export async function getBuildStatuses(pr: PullRequest): Promise<Bitbucket.Schema.Commitstatus[]> {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
        const { data } = await bb.pullrequests.listStatuses({
            pull_request_id: pr.data.id!,
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.buildStatuses
        });

        const statuses = data.values || [];
        return statuses.filter(status => status.type === 'build');
    }

    export async function getDefaultReviewers(remote: Remote): Promise<Reviewer[]> {
        const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
        const { data } = await bb.pullrequests.listDefaultReviewers({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.reviewers
        });

        const reviewers: Bitbucket.Schema.Participant[] = data.values || [];
        return reviewers.map(reviewer => ({
            accountId: reviewer.account_id!,
            displayName: reviewer.display_name!,
            url: reviewer.links!.html!.href!,
            avatarUrl: reviewer.links!.avatar!.href!,
            approved: !!reviewer.approved,
            role: reviewer.role!
        }));
    }

    export function getBitbucketRemotes(repository: Repository): Remote[] {
        return repository.state.remotes.filter(remote => {
            const remoteUrl = remote.fetchUrl || remote.pushUrl;
            let parsed = remoteUrl ? GitUrlParse(remoteUrl) : null;
            return parsed && bitbucketHosts.has(parsed.source);
        });
    }

    export async function create(pr: PullRequest): Promise<PullRequest> {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source);
        const { data } = await bb.pullrequests.create({
            repo_slug: parsed.name,
            username: parsed.owner,
            _body: {
                type: pr.data.type,
                title: pr.data.title,
                summary: pr.data.summary,
                source: pr.data.source,
                destination: pr.data.destination,
                reviewers: pr.data.reviewers,
                close_source_branch: pr.data.close_source_branch

            }
        });

        return { ...pr, ...{ data: data } };
    }

    export async function approve(pr: PullRequest) {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source);
        return await bb.pullrequests.createApproval({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner
        });
    }

    export async function merge(pr: PullRequest, closeSourceBranch?: boolean, mergeStrategy?: 'merge_commit' | 'squash' | 'fast_forward') {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source);

        let body = Object.create({});
        body = closeSourceBranch ? { ...body, close_source_branch: closeSourceBranch } : body;
        body = mergeStrategy ? { ...body, merge_strategy: mergeStrategy } : body;

        return await bb.pullrequests.merge({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner,
            _body: body
        });
    }

    export async function postComment(
        remote: Remote,
        prId: number, text: string,
        parentCommentId?: number,
        inline?: { from?: number, to?: number, path: string }
    ): Promise<Bitbucket.Schema.Comment> {
        const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source);
        prCommentEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
        //@ts-ignore
        return await bb.pullrequests.createComment({
            pull_request_id: prId,
            repo_slug: parsed.name,
            username: parsed.owner,
            _body: {
                parent: parentCommentId ? { id: parentCommentId } : undefined,
                content: {
                    raw: text
                },
                inline: inline
            } as any
        });
    }
}