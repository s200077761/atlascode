import { Repository, Remote } from "../typings/git";
import { PullRequest, PaginatedPullRequests, PaginatedCommits, PaginatedComments, PaginatedFileChanges, Reviewer, Comment, UnknownUser, BuildStatus, PullRequestData, CreatePullRequestData, PullRequestApi } from './model';
import { Container } from "../container";
import { prCommentEvent } from '../analytics';
import { getBitbucketRemotes, parseGitUrl, clientForHostname, clientForRemote, urlForRemote } from "./bbUtils";
import { CloudRepositoriesApi } from "./repositories";

export const maxItemsSupported = {
    commits: 100,
    comments: 100,
    reviewers: 100,
    buildStatuses: 100
};
export const defaultPagelen = 25;
const dummyRemote = { name: '', isReadOnly: true };

export class CloudPullRequestApi implements PullRequestApi {

    async  getList(repository: Repository, queryParams?: { pagelen?: number, sort?: string, q?: string }): Promise<PaginatedPullRequests> {
        let remotes = getBitbucketRemotes(repository);

        for (let i = 0; i < remotes.length; i++) {
            let remote = remotes[i];
            let parsed = parseGitUrl(remote.fetchUrl! || remote.pushUrl!);
            const bb = await clientForHostname(parsed.resource) as Bitbucket;
            const { data } = await bb.repositories.listPullRequests({
                ...{
                    username: parsed.owner,
                    repo_slug: parsed.name,
                    pagelen: defaultPagelen
                },
                ...queryParams
            });
            const prs: PullRequest[] = data.values!.map((pr: Bitbucket.Schema.Pullrequest) => { return { repository: repository, remote: remote, data: CloudPullRequestApi.toPullRequestData(pr) }; });
            const next = data.next;
            // Handling pull requests from multiple remotes is not implemented. We stop when we see the first remote with PRs.
            if (prs.length > 0) {
                return { repository: repository, remote: remote, data: prs, next: next };
            }
        }

        return { repository: repository, remote: dummyRemote, data: [], next: undefined };
    }

    async  getListCreatedByMe(repository: Repository): Promise<PaginatedPullRequests> {
        return this.getList(
            repository,
            { q: `state="OPEN" and author.account_id="${(await Container.bitbucketContext.currentUser(repository)).accountId}"` });
    }

    async  getListToReview(repository: Repository): Promise<PaginatedPullRequests> {
        return this.getList(
            repository,
            { q: `state="OPEN" and reviewers.account_id="${(await Container.bitbucketContext.currentUser(repository)).accountId}"` });
    }

    async  nextPage({ repository, remote, next }: PaginatedPullRequests): Promise<PaginatedPullRequests> {
        const bb = await clientForRemote(remote) as Bitbucket;
        const { data } = await bb.getNextPage({ next: next });
        //@ts-ignore
        const prs = (data as Bitbucket.Schema.Pullrequest).values!.map(pr => { return { repository: repository, remote: remote, data: this.toPullRequestData(pr) }; });
        return { repository: repository, remote: remote, data: prs, next: data.next };
    }

    async  getLatest(repository: Repository): Promise<PaginatedPullRequests> {
        return this.getList(
            repository,
            { pagelen: 2, sort: '-created_on', q: `state="OPEN" and reviewers.account_id="${(await Container.bitbucketContext.currentUser(repository)).accountId}"` });
    }

    async  getRecentAllStatus(repository: Repository): Promise<PaginatedPullRequests> {
        return this.getList(
            repository,
            { pagelen: 1, sort: '-created_on', q: 'state="OPEN" OR state="MERGED" OR state="SUPERSEDED" OR state="DECLINED"' });
    }

    async  get(pr: PullRequest): Promise<PullRequest> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb = await clientForHostname(parsed.resource) as Bitbucket;
        let { data } = await bb.repositories.getPullRequest({
            pull_request_id: pr.data.id!,
            repo_slug: parsed.name,
            username: parsed.owner
        });
        let sourceRemote: Remote | undefined = undefined;
        if (data.source!.repository!.links!.html!.href! !== data.destination!.repository!.links!.html!.href!) {
            sourceRemote = {
                fetchUrl: parseGitUrl(data.source!.repository!.links!.html!.href!).toString(parsed.protocol),
                name: data.source!.repository!.full_name!,
                isReadOnly: true
            };
        }
        return { repository: pr.repository, remote: pr.remote, sourceRemote: sourceRemote, data: CloudPullRequestApi.toPullRequestData(data) };
    }

    async  getChangedFiles(pr: PullRequest): Promise<PaginatedFileChanges> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb = await clientForHostname(parsed.resource) as Bitbucket;
        let { data } = await bb.pullrequests.getDiffStat({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner
        });

        const diffStats: Bitbucket.Schema.Diffstat[] = data.values || [];

        return {
            data: diffStats.map(diffStat => ({
                status: diffStat.status!,
                oldPath: diffStat.old ? diffStat.old.path! : undefined,
                newPath: diffStat.new ? diffStat.new.path! : undefined
            })),
            next: data.next
        };
    }

    async  getCommits(pr: PullRequest): Promise<PaginatedCommits> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb = await clientForHostname(parsed.resource) as Bitbucket;
        let { data } = await bb.pullrequests.listCommits({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.commits
        });

        const commits = (data.values || []) as Bitbucket.Schema.Commit[];

        return {
            data: commits.map(commit => ({
                hash: commit.hash!,
                message: commit.message!,
                ts: commit.date!,
                url: commit.links!.html!.href!,
                htmlSummary: commit.summary ? commit.summary.html! : undefined,
                rawSummary: commit.summary ? commit.summary.raw! : undefined,
                author: {
                    accountId: commit.author!.user!.account_id,
                    displayName: commit.author!.user!.display_name!,
                    url: commit.author!.user!.links!.html!.href!,
                    avatarUrl: commit.author!.user!.links!.avatar!.href!
                }
            })),
            next: data.next
        };
    }

    async  getComments(pr: PullRequest): Promise<PaginatedComments> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb = await clientForHostname(parsed.resource) as Bitbucket;
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

        const nestedComments = this.toNestedList(
            comments.map(comment => ({
                id: comment.id!,
                parentId: comment.parent ? comment.parent.id! : undefined,
                htmlContent: comment.content!.html!,
                rawContent: comment.content!.raw!,
                ts: comment.created_on!,
                updatedTs: comment.updated_on!,
                deleted: !!comment.deleted,
                inline: comment.inline,
                user: comment.user
                    ? {
                        accountId: comment.user.account_id!,
                        displayName: comment.user.display_name!,
                        url: comment.user.links!.html!.href!,
                        avatarUrl: comment.user.links!.avatar!.href!
                    }
                    : UnknownUser,
                children: []
            })));

        return {
            data: nestedComments,
            next: undefined
        };
    }

    private toNestedList(comments: Comment[]): Comment[] {
        const commentsTreeMap = new Map<Number, Comment>();
        comments.forEach(c => commentsTreeMap.set(c.id!, c));
        comments.forEach(c => {
            const n = commentsTreeMap.get(c.id!);
            const pid = c.parentId;
            if (pid && commentsTreeMap.get(pid)) {
                commentsTreeMap.get(pid)!.children.push(n!);
            }
        });

        const result: Comment[] = [];
        commentsTreeMap.forEach((val) => {
            if (!val.parentId) {
                result.push(val);
            }
        });

        return result;
    }

    async  getBuildStatuses(pr: PullRequest): Promise<BuildStatus[]> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        const { data } = await bb.pullrequests.listStatuses({
            pull_request_id: pr.data.id!,
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.buildStatuses
        });

        const statuses = data.values || [];
        return statuses.filter(status => status.type === 'build').map(status => ({
            name: status.name!,
            state: status.state!,
            url: status.url!,
            ts: status.created_on!
        }));
    }

    async  getDefaultReviewers(remote: Remote): Promise<Reviewer[]> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
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

    async  create(repository: Repository, remote: Remote, createPrData: CreatePullRequestData): Promise<PullRequest> {
        let prBody: Bitbucket.Schema.Pullrequest = {
            type: 'pullrequest',
            title: createPrData.title,
            summary: {
                raw: createPrData.summary
            },
            source: {
                branch: {
                    name: createPrData.sourceBranchName
                }
            },
            destination: {
                branch: {
                    name: createPrData.destinationBranchName
                }
            },
            reviewers: createPrData.reviewerAccountIds.map(accountId => ({
                type: 'user',
                account_id: accountId
            })),
            close_source_branch: createPrData.closeSourceBranch
        };

        let parsed = parseGitUrl(urlForRemote(remote));
        const bb = await clientForHostname(parsed.resource) as Bitbucket;
        const { data } = await bb.pullrequests.create({
            repo_slug: parsed.name,
            username: parsed.owner,
            _body: prBody
        });

        return { repository: repository, remote: remote, data: CloudPullRequestApi.toPullRequestData(data) };
    }

    async  approve(pr: PullRequest) {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb = await clientForHostname(parsed.resource) as Bitbucket;
        await bb.pullrequests.createApproval({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner
        });
    }

    async  merge(pr: PullRequest, closeSourceBranch?: boolean, mergeStrategy?: 'merge_commit' | 'squash' | 'fast_forward') {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb = await clientForHostname(parsed.resource) as Bitbucket;

        let body = Object.create({});
        body = closeSourceBranch ? { ...body, close_source_branch: closeSourceBranch } : body;
        body = mergeStrategy ? { ...body, merge_strategy: mergeStrategy } : body;

        await bb.pullrequests.merge({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner,
            _body: body
        });
    }

    async  postComment(
        remote: Remote,
        prId: number, text: string,
        parentCommentId?: number,
        inline?: { from?: number, to?: number, path: string }
    ): Promise<Comment> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb = await clientForHostname(parsed.resource) as Bitbucket;
        prCommentEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });

        const { data } = await bb.pullrequests.createComment({
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

        return {
            id: data.id!,
            parentId: data.parent ? data.parent.id! : undefined,
            htmlContent: data.content!.html!,
            rawContent: data.content!.raw!,
            ts: data.created_on!,
            updatedTs: data.updated_on!,
            deleted: !!data.deleted,
            inline: data.inline,
            user: data.user
                ? {
                    accountId: data.user.account_id!,
                    displayName: data.user.display_name!,
                    url: data.user.links!.html!.href!,
                    avatarUrl: data.user.links!.avatar!.href!
                }
                : UnknownUser,
            children: []
        };
    }

    static toPullRequestData(pr: Bitbucket.Schema.Pullrequest): PullRequestData {
        return {
            id: pr.id!,
            url: pr.links!.html!.href!,
            author: {
                accountId: pr.author!.account_id,
                displayName: pr.author!.display_name!,
                url: pr.author!.links!.html!.href!,
                avatarUrl: pr.author!.links!.avatar!.href!
            },
            reviewers: [],
            participants: (pr.participants || [])!.map(participant => ({
                accountId: participant.user!.account_id!,
                displayName: participant.user!.display_name!,
                url: participant.user!.links!.html!.href!,
                avatarUrl: participant.user!.links!.avatar!.href!,
                role: participant.role!,
                approved: !!participant.approved
            })),
            source: {
                repo: CloudRepositoriesApi.toRepo(pr.source!.repository!),
                branchName: pr.source!.branch!.name!,
                commitHash: pr.source!.commit!.hash!
            },
            destination: {
                repo: CloudRepositoriesApi.toRepo(pr.destination!.repository!),
                branchName: pr.destination!.branch!.name!,
                commitHash: pr.destination!.commit!.hash!
            },
            title: pr.title!,
            htmlSummary: pr.summary ? pr.summary.html! : undefined,
            rawSummary: pr.summary ? pr.summary!.raw! : undefined,
            ts: pr.created_on!,
            updatedTs: pr.updated_on!,
            state: pr.state!,
            closeSourceBranch: !!pr.close_source_branch,
            taskCount: pr.task_count || 0
        };
    }
}
