import BitbucketServer from '@atlassian/bitbucket-server';
import { PullRequest, PaginatedCommits, User, PaginatedComments, BuildStatus, UnknownUser, PaginatedFileChanges, Comment, PaginatedPullRequests, PullRequestApi, CreatePullRequestData, Reviewer } from '../bitbucket/model';
import { Remote, Repository } from '../typings/git';
import { getBitbucketRemotes, parseGitUrl, urlForRemote, clientForHostname, siteDetailsForRepository, siteDetailsForRemote } from '../bitbucket/bbUtils';
import { Container } from '../container';
import { DetailedSiteInfo } from '../atlclients/authInfo';
import { RepositoryProvider } from '../bitbucket/repoProvider';

const dummyRemote = { name: '', isReadOnly: true };

export class ServerPullRequestApi implements PullRequestApi {

    async getList(repository: Repository, queryParams?: { q?: any, limit?: number }): Promise<PaginatedPullRequests> {

        const remote = getBitbucketRemotes(repository)[0];

        let parsed = parseGitUrl(remote.fetchUrl! || remote.pushUrl!);
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;

        const { data } = await bb.repos.getPullRequests({
            projectKey: parsed.owner,
            repositorySlug: parsed.name,
            ...queryParams
        });
        const prs: PullRequest[] = data.values!.map((pr: BitbucketServer.Schema.Any) => this.toPullRequestModel(repository, remote, pr, 0));
        const next = data.next;
        // Handling pull requests from multiple remotes is not implemented. We stop when we see the first remote with PRs.
        if (prs.length > 0) {
            return { repository: repository, remote: remote, data: prs, next: next };
        }

        return { repository: repository, remote: dummyRemote, data: [], next: undefined };
    }

    async  getListCreatedByMe(repository: Repository): Promise<PaginatedPullRequests> {
        const currentUser = (await Container.authManager.getAuthInfo(await siteDetailsForRepository(repository)!))!.user.id;
        return this.getList(
            repository,
            {
                q: {
                    'username.1': currentUser,
                    'role.1': 'AUTHOR'
                }
            }
        );
    }

    async  getListToReview(repository: Repository): Promise<PaginatedPullRequests> {
        const currentUser = (await Container.authManager.getAuthInfo(await siteDetailsForRepository(repository)!))!.user.id;
        return this.getList(
            repository,
            {
                q: {
                    'username.1': currentUser,
                    'role.1': 'REVIEWER'
                }
            }
        );
    }

    async  nextPage({ repository, remote, next }: PaginatedPullRequests): Promise<PaginatedPullRequests> {
        return { repository: repository, remote: remote, data: [], next: undefined };
    }

    async  getLatest(repository: Repository): Promise<PaginatedPullRequests> {
        const currentUser = (await Container.authManager.getAuthInfo(await siteDetailsForRepository(repository)!))!.user.id;
        return this.getList(
            repository,
            {
                q: {
                    'username.1': currentUser,
                    'role.1': 'REVIEWER',
                    limit: 2
                }
            }
        );
    }

    async  getRecentAllStatus(repository: Repository): Promise<PaginatedPullRequests> {
        return this.getList(
            repository,
            {
                q: {
                    'state': 'ALL'
                }
            });
    }

    async  get(pr: PullRequest): Promise<PullRequest> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;

        const { data } = await bb.pullRequests.get({
            projectKey: parsed.owner,
            repositorySlug: parsed.name,
            pullRequestId: pr.data.id
        });

        const taskCount = await this.getTaskCount(pr);
        return this.toPullRequestModel(pr.repository, pr.remote, data, taskCount);
    }

    async  getChangedFiles(pr: PullRequest): Promise<PaginatedFileChanges> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;

        let { data } = await bb.pullRequests.streamChanges({
            projectKey: parsed.owner,
            repositorySlug: parsed.name,
            pullRequestId: String(pr.data.id)
        });

        const diffStats: BitbucketServer.Schema.Any[] = data.values || [];
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

    async  getCurrentUser(site: DetailedSiteInfo): Promise<User> {
        const bb = await clientForHostname(site.hostname) as BitbucketServer;

        const { data } = await bb.api.getUser({
            userSlug: (await Container.authManager.getAuthInfo(site))!.user.id
        });

        return this.toUser(siteDetailsForRemote({ name: 'dummy', isReadOnly: true, fetchUrl: 'https://bb.pi-jira-server.tk/scm/tp/vscode-bitbucket-server.git' })!, data);
    }

    async  getCommits(pr: PullRequest): Promise<PaginatedCommits> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;

        const { data } = await bb.pullRequests.getCommits({
            projectKey: parsed.owner,
            repositorySlug: parsed.name,
            pullRequestId: pr.data.id
        });
        return {
            data: data.values.map((commit: any) => ({
                author: this.toUser(siteDetailsForRemote(pr.remote)!, commit.author),
                ts: commit.authorTimestamp,
                hash: commit.id,
                message: commit.message,
                url: undefined,
                htmlSummary: undefined,
                rawSummary: undefined
            }))
        };
    }

    async  getComments(pr: PullRequest): Promise<PaginatedComments> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;

        const { data } = await bb.pullRequests.getActivities({
            projectKey: parsed.owner,
            repositorySlug: parsed.name,
            pullRequestId: pr.data.id
        });
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
                ? this.toUser(siteDetailsForRemote(remote)!, comment.author)
                : UnknownUser,
            children: (comment.comments || []).map((c: any) => this.toCommentModel(c, commentAnchor, comment.id, remote))
        };
    }

    async  getBuildStatuses(pr: PullRequest): Promise<BuildStatus[]> {
        return [];
    }

    async  getDefaultReviewers(remote: Remote, query: string): Promise<Reviewer[]> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;

        let users: BitbucketServer.Schema.User[] = [];

        if (!query) {
            const repo = await RepositoryProvider.forRemote(remote).get(remote);
            const { data } = await bb.repos.getDefaultReviewers({
                projectKey: parsed.owner,
                repositorySlug: parsed.name,
                sourceRepoId: Number(repo.id),
                targetRepoId: Number(repo.id),
                sourceRefId: repo.mainbranch!,
                targetRefId: repo.mainbranch!
            });
            users = Array.isArray(data) ? data : [];
        } else {
            const { data } = await bb.api.getUsers({
                q: {
                    'permission.1': 'REPO_READ',
                    'permission.1.projectKey': parsed.owner,
                    'permission.1.repositorySlug': parsed.name,
                    filter: query,
                    limit: 10
                }
            });
            users = data.values || [];
        }

        return users.map(val => ({ ...this.toUser(siteDetailsForRemote(remote)!, val), approved: false, role: 'PARTICIPANT' as 'PARTICIPANT' }));
    }

    async  create(repository: Repository, remote: Remote, createPrData: CreatePullRequestData): Promise<PullRequest> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;

        const { data } = await bb.repos.createPullRequest({
            projectKey: parsed.owner,
            repositorySlug: parsed.name,
            body: {
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
            }
        });

        return this.toPullRequestModel(repository, remote, data, 0);
    }

    async  approve(pr: PullRequest) {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;

        await bb.participants.updateStatus({
            projectKey: parsed.owner,
            repositorySlug: parsed.name,
            pullRequestId: pr.data.id,
            userSlug: (await Container.authManager.getAuthInfo(await siteDetailsForRepository(pr.repository)!))!.user.id,
            body: {
                "status": "APPROVED"
            }
        });
    }

    async  merge(pr: PullRequest, closeSourceBranch?: boolean, mergeStrategy?: 'merge_commit' | 'squash' | 'fast_forward') {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;

        await bb.pullRequests.merge({
            projectKey: parsed.owner,
            repositorySlug: parsed.name,
            pullRequestId: pr.data.id,
            version: pr.data.version
        });
    }

    async  postComment(
        remote: Remote,
        prId: number, text: string,
        parentCommentId?: number,
        inline?: { from?: number, to?: number, path: string }
    ): Promise<Comment> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;

        const { data } = await bb.pullRequests.createComment({
            projectKey: parsed.owner,
            repositorySlug: parsed.name,
            pullRequestId: String(prId),
            body: {
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
            }
        });

        return {
            id: data.id,
            parentId: data.parentId,
            user: this.toUser(siteDetailsForRemote(remote)!, data.author),
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
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;
        const { data } = await bb.pullRequests.getTaskCount({
            projectKey: parsed.owner,
            repositorySlug: parsed.name,
            pullRequestId: String(pr.data.id)
        });

        return data;
    }

    getBitbucketRemotes(repository: Repository): Remote[] {
        return [];
    }

    toUser(site: DetailedSiteInfo, input: BitbucketServer.Schema.User): User {
        return {
            accountId: input.slug!,
            displayName: input.displayName!,
            url: input.links && input.links.self ? input.links.self[0].href : undefined,
            avatarUrl: this.patchAvatarUrl(site.baseLinkUrl, input.avatarUrl)
        };
    }

    toPullRequestModel(repository: Repository, remote: Remote, data: BitbucketServer.Schema.Any, taskCount: number): PullRequest {
        const site = siteDetailsForRemote(remote)!;
        return {
            remote: remote,
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
                        role: reviewer.role,
                        approved: reviewer.approved
                    }
                )),
                source: {
                    repo: {
                        id: data.fromRef.repository.id,
                        name: data.fromRef.repository.slug,
                        displayName: data.fromRef.repository.name,
                        fullName: `${data.fromRef.repository.project.key}/${data.fromRef.repository.slug}`,
                        url: data.fromRef.repository.links.self[0].href,
                        avatarUrl: this.patchAvatarUrl(site.baseLinkUrl, data.fromRef.repository.avatarUrl),
                        mainbranch: undefined,
                        issueTrackerEnabled: false
                    },
                    branchName: data.fromRef.displayId,
                    commitHash: data.fromRef.latestCommit
                },
                destination: {
                    repo: {
                        id: data.toRef.repository.id,
                        name: data.toRef.repository.slug,
                        displayName: data.toRef.repository.name,
                        fullName: `${data.toRef.repository.project.key}/${data.fromRef.repository.slug}`,
                        url: data.toRef.repository.links.self[0].href,
                        avatarUrl: this.patchAvatarUrl(site.baseLinkUrl, data.toRef.repository.avatarUrl),
                        mainbranch: undefined,
                        issueTrackerEnabled: false
                    },
                    branchName: data.toRef.displayId,
                    commitHash: data.toRef.latestCommit
                },
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

    patchAvatarUrl(baseUrl: string, avatarUrl: string): string {
        if (avatarUrl && !/^http/.test(avatarUrl)) {
            return `${baseUrl}${avatarUrl}`;
        }
        return avatarUrl;
    }
}
