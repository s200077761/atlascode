import { Repository, Remote } from "../../typings/git";
import { PullRequest, PaginatedPullRequests, PaginatedCommits, PaginatedComments, PaginatedFileChanges, Reviewer, Comment, UnknownUser, BuildStatus, CreatePullRequestData, PullRequestApi, User } from '../model';
import { Container } from "../../container";
import { prCommentEvent } from '../../analytics';
import { parseGitUrl, urlForRemote } from "../bbUtils";
import { CloudRepositoriesApi } from "./repositories";
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { Client, ClientError } from "../httpClient";
import { AxiosResponse } from "axios";

export const maxItemsSupported = {
    commits: 100,
    comments: 100,
    reviewers: 100,
    buildStatuses: 100
};
export const defaultPagelen = 25;
const dummyRemote = { name: '', isReadOnly: true };

export class CloudPullRequestApi implements PullRequestApi {
    private client: Client;

    constructor(site: DetailedSiteInfo, token: string, agent: any) {
        this.client = new Client(
            site.baseApiUrl,
            `Bearer ${token}`,
            agent,
            async (response: AxiosResponse): Promise<Error> => {
                let errString = 'Unknown error';
                const errJson = response.data;

                if (errJson.error && errJson.error.message) {
                    errString = errJson.error.message;
                } else {
                    errString = errJson;
                }

                return new ClientError(response.statusText, errString);
            }
        );
    }

    async getCurrentUser(site: DetailedSiteInfo): Promise<User> {
        const { data } = await this.client.get(
            '/user'
        );

        return {
            accountId: data.account_id!,
            avatarUrl: data.links!.avatar!.href!,
            displayName: data.display_name!,
            url: data.links!.html!.href!
        };
    }

    async getList(repository: Repository, remote: Remote, queryParams?: { pagelen?: number, sort?: string, q?: string }): Promise<PaginatedPullRequests> {
        let parsed = parseGitUrl(remote.fetchUrl! || remote.pushUrl!);

        const { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests`,
            {
                pagelen: defaultPagelen,
                ...queryParams
            }
        );

        const prs: PullRequest[] = data.values!.map((pr: any) => CloudPullRequestApi.toPullRequestData(repository, remote, pr));
        const next = data.next;
        // Handling pull requests from multiple remotes is not implemented. We stop when we see the first remote with PRs.
        if (prs.length > 0) {
            return { repository: repository, remote: remote, data: prs, next: next };
        }

        return { repository: repository, remote: dummyRemote, data: [], next: undefined };
    }

    async getListCreatedByMe(repository: Repository, remote: Remote): Promise<PaginatedPullRequests> {
        return this.getList(
            repository,
            remote,
            { q: `state="OPEN" and author.account_id="${(await Container.bitbucketContext.currentUser(remote)).accountId}"` });
    }

    async getListToReview(repository: Repository, remote: Remote): Promise<PaginatedPullRequests> {
        return this.getList(
            repository,
            remote,
            { q: `state="OPEN" and reviewers.account_id="${(await Container.bitbucketContext.currentUser(remote)).accountId}"` });
    }

    async nextPage({ repository, remote, next }: PaginatedPullRequests): Promise<PaginatedPullRequests> {
        const { data } = await this.client.get(next!);

        const prs = (data).values!.map((pr: any) => CloudPullRequestApi.toPullRequestData(repository, remote, pr));
        return { repository: repository, remote: remote, data: prs, next: data.next };
    }

    async getLatest(repository: Repository, remote: Remote): Promise<PaginatedPullRequests> {
        return this.getList(
            repository,
            remote,
            { pagelen: 2, sort: '-created_on', q: `state="OPEN" and reviewers.account_id="${(await Container.bitbucketContext.currentUser(remote)).accountId}"` });
    }

    async getRecentAllStatus(repository: Repository, remote: Remote): Promise<PaginatedPullRequests> {
        return this.getList(
            repository,
            remote,
            { sort: '-created_on', q: 'state="OPEN" OR state="MERGED" OR state="SUPERSEDED" OR state="DECLINED"' });
    }

    async get(pr: PullRequest): Promise<PullRequest> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        const { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}`,
        );

        return CloudPullRequestApi.toPullRequestData(pr.repository, pr.remote, data);
    }

    async getChangedFiles(pr: PullRequest): Promise<PaginatedFileChanges> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        const { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/diffstat`,
        );

        const diffStats: any[] = data.values || [];

        return {
            data: diffStats.map(diffStat => ({
                status: diffStat.status!,
                oldPath: diffStat.old ? diffStat.old.path! : undefined,
                newPath: diffStat.new ? diffStat.new.path! : undefined
            })),
            next: data.next
        };
    }

    async getCommits(pr: PullRequest): Promise<PaginatedCommits> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        const { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/commits`,
            {
                pagelen: maxItemsSupported.commits
            }
        );

        const commits = (data.values || []) as any[];

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

    async getComments(pr: PullRequest): Promise<PaginatedComments> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        let { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/comments`,
            {
                pagelen: maxItemsSupported.comments
            }
        );

        if (!data.values) {
            return { data: [], next: undefined };
        }

        const accumulatedComments = data.values as any[];
        while (data.next) {
            const nextPage = await this.client.get(data.next);
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
            } as any;
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

    async getBuildStatuses(pr: PullRequest): Promise<BuildStatus[]> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        const { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/statuses`,
            {
                pagelen: maxItemsSupported.buildStatuses
            }
        );

        const statuses = data.values || [];
        return statuses.filter((status: any) => status.type === 'build').map((status: any) => ({
            name: status.name!,
            state: status.state!,
            url: status.url!,
            ts: status.created_on!
        }));
    }

    async getDefaultReviewers(remote: Remote, query?: string): Promise<Reviewer[]> {
        let parsed = parseGitUrl(urlForRemote(remote));

        let reviewers: any[] = [];
        if (!query) {
            const { data } = await this.client.get(
                `/repositories/${parsed.owner}/${parsed.name}/default-reviewers`,
                {
                    pagelen: maxItemsSupported.reviewers
                }
            );
            reviewers = data.values || [];
        } else {
            const { data } = await this.client.get(
                `/teams/${parsed.owner}/members?q=nickname~"${query}"`
            );
            reviewers = data.values || [];
        }

        return reviewers.map(reviewer => ({
            accountId: reviewer.account_id!,
            displayName: reviewer.display_name!,
            url: reviewer.links!.html!.href!,
            avatarUrl: reviewer.links!.avatar!.href!,
            approved: !!reviewer.approved,
            role: reviewer.role!
        }));
    }

    async create(repository: Repository, remote: Remote, createPrData: CreatePullRequestData): Promise<PullRequest> {
        let prBody = {
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

        const { data } = await this.client.post(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests`,
            prBody
        );

        return CloudPullRequestApi.toPullRequestData(repository, remote, data);
    }

    async updateApproval(pr: PullRequest, approved: boolean) {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        approved
            ? await this.client.post(
                `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/approve`,
                {}
            )
            : await this.client.delete(
                `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/approve`,
                {}
            );
    }

    async merge(pr: PullRequest, closeSourceBranch?: boolean, mergeStrategy?: 'merge_commit' | 'squash' | 'fast_forward') {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        let body = Object.create({});
        body = closeSourceBranch ? { ...body, close_source_branch: closeSourceBranch } : body;
        body = mergeStrategy ? { ...body, merge_strategy: mergeStrategy } : body;

        await this.client.post(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/merge`,
            body
        );
    }

    async postComment(
        remote: Remote,
        prId: number, text: string,
        parentCommentId?: number,
        inline?: { from?: number, to?: number, path: string }
    ): Promise<Comment> {
        let parsed = parseGitUrl(urlForRemote(remote));
        prCommentEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });

        const { data } = await this.client.post(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${prId}/comments`,
            {
                parent: parentCommentId ? { id: parentCommentId } : undefined,
                content: {
                    raw: text
                },
                inline: inline
            }
        );

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

    static toPullRequestData(repository: Repository, remote: Remote, pr: any): PullRequest {

        const source = CloudPullRequestApi.toPullRequestRepo(pr.source);
        const destination = CloudPullRequestApi.toPullRequestRepo(pr.destination);
        let sourceRemote = undefined;
        if (source.repo.url !== '' && source.repo.url !== destination.repo.url) {
            const parsed = parseGitUrl(urlForRemote(remote));
            sourceRemote = {
                fetchUrl: parseGitUrl(source.repo.url).toString(parsed.protocol),
                name: source.repo.fullName,
                isReadOnly: true
            };
        }

        return {
            repository: repository,
            remote: remote,
            sourceRemote: sourceRemote,
            data: {
                id: pr.id!,
                version: -1,
                url: pr.links!.html!.href!,
                author: {
                    accountId: pr.author!.account_id,
                    displayName: pr.author!.display_name!,
                    url: pr.author!.links!.html!.href!,
                    avatarUrl: pr.author!.links!.avatar!.href!
                },
                reviewers: [],
                participants: (pr.participants || [])!.map((participant: any) => ({
                    accountId: participant.user!.account_id!,
                    displayName: participant.user!.display_name!,
                    url: participant.user!.links!.html!.href!,
                    avatarUrl: participant.user!.links!.avatar!.href!,
                    role: participant.role!,
                    approved: !!participant.approved
                })),
                source: source,
                destination: destination,
                title: pr.title!,
                htmlSummary: pr.summary ? pr.summary.html! : undefined,
                rawSummary: pr.summary ? pr.summary!.raw! : undefined,
                ts: pr.created_on!,
                updatedTs: pr.updated_on!,
                state: pr.state!,
                closeSourceBranch: !!pr.close_source_branch,
                taskCount: pr.task_count || 0
            }
        };
    }

    static toPullRequestRepo(prRepo: any) {
        const repo = CloudRepositoriesApi.toRepo(prRepo.repository);
        const branchName = prRepo && prRepo.branch && prRepo.branch.name
            ? prRepo.branch.name
            : 'BRANCH_NOT_FOUND';
        const commitHash = prRepo && prRepo.commit && prRepo.commit.hash
            ? prRepo.commit.hash
            : 'COMMIT_HASH_NOT_FOUND';

        return {
            repo: repo,
            branchName: branchName,
            commitHash: commitHash
        };
    }
}
