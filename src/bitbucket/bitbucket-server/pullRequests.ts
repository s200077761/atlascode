import { PullRequest, PaginatedCommits, User, PaginatedComments, BuildStatus, UnknownUser, PaginatedFileChanges, Comment, PaginatedPullRequests, PullRequestApi, CreatePullRequestData, Reviewer } from '../model';
import { Remote, Repository } from '../../typings/git';
import { parseGitUrl, urlForRemote, siteDetailsForRemote, clientForRemote } from '../bbUtils';
import { Container } from '../../container';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Client, ClientError } from '../httpClient';
import { AxiosResponse } from 'axios';
import { ServerRepositoriesApi } from './repositories';

const dummyRemote = { name: '', isReadOnly: true };

export class ServerPullRequestApi implements PullRequestApi {
    private client: Client;

    constructor(site: DetailedSiteInfo, username: string, password: string, agent: any) {
        this.client = new Client(
            site.baseApiUrl,
            `Basic ${Buffer.from(username + ":" + password).toString('base64')}`,
            agent,
            async (response: AxiosResponse): Promise<Error> => {
                let errString = 'Unknown error';
                const errJson = response.data;

                if (errJson.errors && Array.isArray(errJson.errors) && errJson.errors.length > 0) {
                    const e = errJson.errors[0];
                    errString = e.message || errString;
                } else {
                    errString = errJson;
                }

                return new ClientError(response.statusText, errString);
            }
        );
    }

    async getList(repository: Repository, remote: Remote, queryParams?: { q?: any, limit?: number }): Promise<PaginatedPullRequests> {
        let parsed = parseGitUrl(remote.fetchUrl! || remote.pushUrl!);

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/pull-requests`,
            {
                markup: true,
                avatarSize: 64,
                ...queryParams
            }
        );
        const prs: PullRequest[] = data.values!.map((pr: any) => ServerPullRequestApi.toPullRequestModel(repository, remote, pr, 0));
        const next = data.next;
        // Handling pull requests from multiple remotes is not implemented. We stop when we see the first remote with PRs.
        if (prs.length > 0) {
            return { repository: repository, remote: remote, data: prs, next: next };
        }

        return { repository: repository, remote: dummyRemote, data: [], next: undefined };
    }

    async getListCreatedByMe(repository: Repository, remote: Remote): Promise<PaginatedPullRequests> {
        const currentUser = (await Container.authManager.getAuthInfo(await siteDetailsForRemote(remote)!))!.user.id;
        return this.getList(
            repository,
            remote,
            {
                q: {
                    'username.1': currentUser,
                    'role.1': 'AUTHOR'
                }
            }
        );
    }

    async getListToReview(repository: Repository, remote: Remote): Promise<PaginatedPullRequests> {
        const currentUser = (await Container.authManager.getAuthInfo(await siteDetailsForRemote(remote)!))!.user.id;
        return this.getList(
            repository,
            remote,
            {
                q: {
                    'username.1': currentUser,
                    'role.1': 'REVIEWER'
                }
            }
        );
    }

    async nextPage({ repository, remote, next }: PaginatedPullRequests): Promise<PaginatedPullRequests> {
        return { repository: repository, remote: remote, data: [], next: undefined };
    }

    async getLatest(repository: Repository, remote: Remote): Promise<PaginatedPullRequests> {
        const currentUser = (await Container.authManager.getAuthInfo(await siteDetailsForRemote(remote)!))!.user.id;
        return this.getList(
            repository,
            remote,
            {
                q: {
                    'username.1': currentUser,
                    'role.1': 'REVIEWER',
                    limit: 2
                }
            }
        );
    }

    async getRecentAllStatus(repository: Repository, remote: Remote): Promise<PaginatedPullRequests> {
        return this.getList(
            repository,
            remote,
            {
                q: {
                    'state': 'ALL'
                }
            });
    }

    async get(pr: PullRequest): Promise<PullRequest> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/pull-requests/${pr.data.id}`,
            {
                markup: true,
                avatarSize: 64
            }
        );

        const taskCount = await this.getTaskCount(pr);
        return ServerPullRequestApi.toPullRequestModel(pr.repository, pr.remote, data, taskCount);
    }

    async getChangedFiles(pr: PullRequest): Promise<PaginatedFileChanges> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        let { data } = await this.client.get(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/pull-requests/${pr.data.id}/changes`,
            {
                markup: true,
                avatarSize: 64
            }
        );

        const diffStats: any[] = data.values || [];
        diffStats.map(diffStat => {
            switch (diffStat.type) {
                case 'ADD':
                case 'COPY':
                    diffStat.type = 'added';
                    break;
                case 'DELETE':
                    diffStat.type = 'removed';
                    break;
                case 'MOVE':
                    diffStat.type = 'renamed';
                    break;
                case 'MODIFY':
                default:
                    diffStat.type = 'modified';
                    break;
            }
        });
        return {
            data: diffStats.map(diffStat => ({
                status: diffStat.type,
                oldPath: diffStat.type === 'added' ? undefined : diffStat.path.toString,
                newPath: diffStat.type === 'removed' ? undefined : diffStat.path.toString
            })),
            next: data.next
        };
    }

    async getCurrentUser(site: DetailedSiteInfo): Promise<User> {
        const userSlug = (await Container.authManager.getAuthInfo(site))!.user.id;
        const { data } = await this.client.get(
            `/rest/api/1.0/users/${userSlug}`,
            {
                markup: true,
                avatarSize: 64
            }
        );

        return ServerPullRequestApi.toUser(siteDetailsForRemote({ name: 'dummy', isReadOnly: true, fetchUrl: 'https://bb.pi-jira-server.tk/scm/tp/vscode-bitbucket-server.git' })!, data);
    }

    async getCommits(pr: PullRequest): Promise<PaginatedCommits> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        let { data } = await this.client.get(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/pull-requests/${pr.data.id}/commits`,
            {
                markup: true,
                avatarSize: 64
            }
        );

        return {
            data: data.values.map((commit: any) => ({
                author: ServerPullRequestApi.toUser(siteDetailsForRemote(pr.remote)!, commit.author),
                ts: commit.authorTimestamp,
                hash: commit.id,
                message: commit.message,
                url: undefined,
                htmlSummary: undefined,
                rawSummary: undefined
            }))
        };
    }

    async getComments(pr: PullRequest): Promise<PaginatedComments> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        let { data } = await this.client.get(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/pull-requests/${pr.data.id}/activities`,
            {
                markup: true,
                avatarSize: 64
            }
        );

        const activities = (data.values as Array<any>).filter(activity => activity.action === 'COMMENTED');

        return {
            data: activities.map(activity => this.toCommentModel(activity.comment, activity.commentAnchor, undefined, pr.remote))
        };
    }

    private toCommentModel(comment: any, commentAnchor: any, parentId: number | undefined, remote: Remote): Comment {
        return {
            id: comment.id!,
            parentId: parentId,
            htmlContent: comment.html,
            rawContent: comment.text,
            ts: comment.createdDate,
            updatedTs: comment.updatedDate,
            deleted: !!comment.deleted,
            inline: commentAnchor
                ? {
                    path: commentAnchor.path,
                    from: commentAnchor.fileType === 'TO' ? undefined : commentAnchor.line,
                    to: commentAnchor.fileType === 'TO' ? commentAnchor.line : undefined
                }
                : undefined,
            user: comment.author
                ? ServerPullRequestApi.toUser(siteDetailsForRemote(remote)!, comment.author)
                : UnknownUser,
            children: (comment.comments || []).map((c: any) => this.toCommentModel(c, commentAnchor, comment.id, remote))
        };
    }

    async getBuildStatuses(pr: PullRequest): Promise<BuildStatus[]> {
        return [];
    }

    async getReviewers(remote: Remote, query: string): Promise<Reviewer[]> {
        let parsed = parseGitUrl(urlForRemote(remote));

        let users: any[] = [];

        if (!query) {
            const bbApi = await clientForRemote(remote);
            const repo = await bbApi.repositories.get(remote);

            let { data } = await this.client.get(
                `/rest/default-reviewers/1.0/projects/${parsed.owner}/repos/${parsed.name}/reviewers`,
                {
                    markup: true,
                    avatarSize: 64,
                    sourceRepoId: Number(repo.id),
                    targetRepoId: Number(repo.id),
                    sourceRefId: repo.mainbranch!,
                    targetRefId: repo.mainbranch!
                }
            );

            users = Array.isArray(data) ? data : [];
        } else {
            const { data } = await this.client.get(
                `/rest/api/1.0/users`,
                {
                    markup: true,
                    avatarSize: 64,
                    'permission.1': 'REPO_READ',
                    'permission.1.projectKey': parsed.owner,
                    'permission.1.repositorySlug': parsed.name,
                    filter: query,
                    limit: 10
                }
            );

            users = data.values || [];
        }

        return users.map(val => ({
            ...ServerPullRequestApi.toUser(siteDetailsForRemote(remote)!, val),
            mention: `@${val.slug}`,
            approved: false,
            role: 'PARTICIPANT' as 'PARTICIPANT'
        }));
    }

    async create(repository: Repository, remote: Remote, createPrData: CreatePullRequestData): Promise<PullRequest> {
        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this.client.post(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/pull-requests`,
            {
                title: createPrData.title,
                description: createPrData.summary,
                fromRef: {
                    id: createPrData.sourceBranchName
                },
                toRef: {
                    id: createPrData.destinationBranchName
                },
                reviewers: createPrData.reviewerAccountIds.map(accountId => ({
                    user: {
                        name: accountId
                    }
                }))
            },
            {
                markup: true,
                avatarSize: 64
            }
        );

        return ServerPullRequestApi.toPullRequestModel(repository, remote, data, 0);
    }

    async updateApproval(pr: PullRequest, approved: boolean) {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        const userSlug = (await Container.authManager.getAuthInfo(await siteDetailsForRemote(pr.remote)!))!.user.id;

        await this.client.put(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/pull-requests/${pr.data.id}/participants/${userSlug}`,
            {
                status: approved ? 'APPROVED' : 'UNAPPROVED'
            }
        );
    }

    async merge(pr: PullRequest, closeSourceBranch?: boolean, mergeStrategy?: 'merge_commit' | 'squash' | 'fast_forward') {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        await this.client.post(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/pull-requests/${pr.data.id}/merge`,
            {
                version: pr.data.version
            }
        );
    }

    async postComment(
        remote: Remote,
        prId: number, text: string,
        parentCommentId?: number,
        inline?: { from?: number, to?: number, path: string }
    ): Promise<Comment> {
        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this.client.post(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/pull-requests/${prId}/comments`,
            {
                parent: parentCommentId ? { id: parentCommentId } : undefined,
                text: text,
                anchor: inline
                    ? {
                        line: inline!.to || inline!.from,
                        lineType: "CONTEXT",
                        fileType: inline!.to ? "TO" : "FROM",
                        path: inline!.path
                    }
                    : undefined
            },
            {
                markup: true,
                avatarSize: 64
            }
        );

        return {
            id: data.id,
            parentId: data.parentId,
            user: ServerPullRequestApi.toUser(siteDetailsForRemote(remote)!, data.author),
            htmlContent: data.html,
            rawContent: data.text,
            ts: data.createdDate,
            updatedTs: data.updatedDate,
            deleted: false,
            inline: data.commentAnchor
                ? {
                    path: data.commentAnchor.path,
                    from: data.commentAnchor.fileType === 'TO' ? undefined : data.commentAnchor.line,
                    to: data.commentAnchor.fileType === 'TO' ? data.commentAnchor.line : undefined
                }
                : undefined,
            children: []
        };
    }

    private async getTaskCount(pr: PullRequest): Promise<number> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/pull-requests/${pr.data.id}/tasks/count`
        );

        return data;
    }

    static toUser(site: DetailedSiteInfo, input: any): User {
        return {
            accountId: input.slug!,
            displayName: input.displayName!,
            url: input.links && input.links.self ? input.links.self[0].href : undefined,
            avatarUrl: ServerPullRequestApi.patchAvatarUrl(site.baseLinkUrl, input.avatarUrl)
        };
    }

    static toPullRequestModel(repository: Repository, remote: Remote, data: any, taskCount: number): PullRequest {
        const site = siteDetailsForRemote(remote)!;

        const source = ServerPullRequestApi.toPullRequestRepo(remote, data.fromRef, undefined!);
        const destination = ServerPullRequestApi.toPullRequestRepo(remote, data.toRef, undefined!);
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
            remote: remote,
            sourceRemote: sourceRemote,
            repository: repository,
            data: {
                id: data.id,
                version: data.version,
                url: data.links.self[0].href,
                author: this.toUser(site, data.author.user),
                reviewers: [],
                participants: data.reviewers.map((reviewer: any) => (
                    {
                        ...this.toUser(site, reviewer.user),
                        mention: `@${reviewer.user.slug}`,
                        role: reviewer.role,
                        approved: reviewer.approved
                    }
                )),
                source: source,
                destination: destination,
                title: data.title,
                htmlSummary: data.descriptionAsHtml,
                rawSummary: data.description,
                ts: data.createdDate,
                updatedTs: data.updatedDate,
                state: data.state,
                closeSourceBranch: false,
                taskCount: taskCount,
                buildStatuses: []
            }
        };
    }

    static patchAvatarUrl(baseUrl: string, avatarUrl: string): string {
        if (avatarUrl && !/^http/.test(avatarUrl)) {
            return `${baseUrl}${avatarUrl}`;
        }
        return avatarUrl;
    }

    static toPullRequestRepo(remote: Remote, prRepo: any, defaultBranch: string) {
        const repo = ServerRepositoriesApi.toRepo(remote, prRepo.repository, defaultBranch);
        const branchName = prRepo && prRepo.displayId
            ? prRepo.displayId
            : 'BRANCH_NOT_FOUND';
        const commitHash = prRepo && prRepo.latestCommit
            ? prRepo.latestCommit
            : 'COMMIT_HASH_NOT_FOUND';

        return {
            repo: repo,
            branchName: branchName,
            commitHash: commitHash
        };
    }
}


