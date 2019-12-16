import { AxiosResponse } from "axios";
import { prCommentEvent } from '../../analytics';
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { Container } from "../../container";
import { getAgent } from "../../jira/jira-client/providers";
import { Logger } from "../../logger";
import { CacheMap } from "../../util/cachemap";
import { Time } from "../../util/time";
import { Client, ClientError } from "../httpClient";
import { BitbucketSite, BuildStatus, Comment, Commit, CreatePullRequestData, FileChange, FileStatus, MergeStrategy, PaginatedComments, PaginatedPullRequests, PullRequest, PullRequestApi, Task, UnknownUser, User, WorkspaceRepo } from '../model';
import { CloudRepositoriesApi } from "./repositories";

export const maxItemsSupported = {
    commits: 100,
    comments: 100,
    reviewers: 100,
    buildStatuses: 100
};
export const defaultPagelen = 25;

const mergeStrategyLabels = {
    'merge_commit': 'Merge commit',
    'squash': 'Squash',
    'fast_forward': 'Fast forward'
};

export class CloudPullRequestApi implements PullRequestApi {
    private client: Client;
    private fileContentCache: CacheMap = new CacheMap();

    constructor(private site: DetailedSiteInfo, token: string) {
        this.client = new Client(
            site.baseApiUrl,
            `Bearer ${token}`,
            getAgent(site),
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

        return CloudPullRequestApi.toUserModel(data);
    }

    private static toUserModel(input: any): User {
        const accountId = (input && input.account_id) ? input.account_id : 'unknown';
        const avatarUrl = (input && input.links && input.links.avatar && input.links.avatar.href) ? input.links!.avatar!.href! : '';
        const displayName = (input && input.display_name) ? input.display_name : 'Unknown User';
        const url = (input && input.links && input.links.html && input.links.href) ? input.links.href : '';
        const mention = `@[${displayName}](account_id:${accountId})`;

        return {
            accountId: accountId,
            avatarUrl: avatarUrl,
            emailAddress: undefined,
            displayName: displayName,
            url: url,
            mention: mention
        };
    }

    async getCurrentUserPullRequests(): Promise<PaginatedPullRequests> {
        const { data } = await this.client.get(
            `/pullrequests/${this.site.userId}`,
            {
                pagelen: defaultPagelen,
                fields: '+values.participants,+values.source.repository.slug,+values.destination.repository.slug'
            }
        );

        const prs: PullRequest[] = data.values!.map((pr: any) => {
            const ownerSlug = pr.destination.repository.full_name.slice(0, pr.destination.repository.full_name.lastIndexOf(pr.destination.repository.slug) - 1);
            const repoSlug = pr.destination.repository.slug;
            return CloudPullRequestApi.toPullRequestData(pr, { details: this.site, ownerSlug: ownerSlug, repoSlug: repoSlug });
        });
        const next = data.next;

        if (prs.length > 0) {
            return { site: prs[0].site, data: prs, next: next };
        }
        return { site: undefined!, data: [], next: undefined };
    }

    async getList(workspaceRepo: WorkspaceRepo, queryParams?: { pagelen?: number, sort?: string, q?: string }): Promise<PaginatedPullRequests> {
        const site = workspaceRepo.mainSiteRemote.site;
        if (!site) {
            return { workspaceRepo, site: site!, data: [] };
        }
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests`,
            {
                pagelen: defaultPagelen,
                fields: '+values.participants',
                ...queryParams
            }
        );

        const prs: PullRequest[] = data.values!.map((pr: any) => CloudPullRequestApi.toPullRequestData(pr, site, workspaceRepo));
        const next = data.next;
        // Handling pull requests from multiple remotes is not implemented. We stop when we see the first remote with PRs.
        if (prs.length > 0) {
            return { workspaceRepo, site, data: prs, next: next };
        }

        return { workspaceRepo, site, data: [], next: undefined };
    }

    async getListCreatedByMe(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(
            workspaceRepo,
            { q: `state="OPEN" and author.account_id="${workspaceRepo.mainSiteRemote.site!.details.userId}"` });
    }

    async getListToReview(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(
            workspaceRepo,
            { q: `state="OPEN" and reviewers.account_id="${workspaceRepo.mainSiteRemote.site!.details.userId}"` });
    }

    async nextPage(paginatedPullRequests: PaginatedPullRequests): Promise<PaginatedPullRequests> {
        if (!paginatedPullRequests.next) {
            return { ...paginatedPullRequests, next: undefined };
        }
        const { data } = await this.client.get(paginatedPullRequests.next);

        const prs = (data).values!.map((pr: any) => CloudPullRequestApi.toPullRequestData(pr, paginatedPullRequests.site, paginatedPullRequests.workspaceRepo));
        return { ...paginatedPullRequests, data: prs, next: data.next };
    }

    async getLatest(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(
            workspaceRepo,
            { pagelen: 2, sort: '-created_on', q: `state="OPEN" and reviewers.account_id="${workspaceRepo.mainSiteRemote.site!.details.userId}"` });
    }

    async getRecentAllStatus(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(
            workspaceRepo,
            { sort: '-created_on', q: 'state="OPEN" OR state="MERGED" OR state="SUPERSEDED" OR state="DECLINED"' });
    }

    async get(pr: PullRequest): Promise<PullRequest> {
        const { ownerSlug, repoSlug } = pr.site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}`,
        );

        return CloudPullRequestApi.toPullRequestData(data, pr.site, pr.workspaceRepo);
    }

    async getMergeStrategies(pr: PullRequest): Promise<MergeStrategy[]> {
        const { ownerSlug, repoSlug } = pr.site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}`,
            {
                fields: 'destination.branch.merge_strategies,destination.branch.default_merge_strategy'
            }
        );

        return data.destination.branch.merge_strategies.map((strategy: string) => ({
            label: mergeStrategyLabels[strategy],
            value: strategy,
            isDefault: strategy === data.destination.branch.default_merge_strategy
        }));
    }

    async getChangedFiles(pr: PullRequest): Promise<FileChange[]> {
        const { ownerSlug, repoSlug } = pr.site;

        let { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/diffstat`,
        );

        if (!data.values) {
            return [];
        }

        const accumulatedDiffStats = data.values as any[];
        while (data.next) {
            const nextPage = await this.client.get(data.next);
            data = nextPage.data;
            accumulatedDiffStats.push(...(data.values || []));
        }

        return accumulatedDiffStats.map(diffStat => ({
            linesAdded: diffStat.lines_added ? diffStat.lines_added : 0,
            linesRemoved: diffStat.lines_removed ? diffStat.lines_removed : 0,
            status: this.mapStatusWordsToFileStatus(diffStat.status!),
            oldPath: diffStat.old ? diffStat.old.path! : undefined,
            newPath: diffStat.new ? diffStat.new.path! : undefined,
            hunkMeta: {
                oldPathAdditions: [],
                oldPathDeletions: [],
                newPathAdditions: [],
                newPathDeletions: [],
                newPathContextMap: {}
            }
        }));
    }

    private mapStatusWordsToFileStatus(status: string): FileStatus {
        if (status === 'added') {
            return FileStatus.ADDED;
        } else if (status === 'removed') {
            return FileStatus.DELETED;
        } else if (status === 'modified') {
            return FileStatus.MODIFIED;
        } else if (status === 'renamed') {
            return FileStatus.RENAMED;
        } else if (status === 'merge conflict') {
            return FileStatus.CONFLICT;
        } else {
            return FileStatus.UNKNOWN;
        }
    }

    async getCommits(pr: PullRequest): Promise<Commit[]> {
        const { ownerSlug, repoSlug } = pr.site;

        let { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/commits`,
            {
                pagelen: maxItemsSupported.commits
            }
        );

        if (!data.values) {
            return [];
        }

        const accumulatedCommits = data.values as any[];
        while (data.next) {
            const nextPage = await this.client.get(data.next);
            data = nextPage.data;
            accumulatedCommits.push(...(data.values || []));
        }

        return accumulatedCommits.map(commit => ({
            hash: commit.hash!,
            message: commit.message!,
            ts: commit.date!,
            url: commit.links!.html!.href!,
            htmlSummary: commit.summary ? commit.summary.html! : undefined,
            rawSummary: commit.summary ? commit.summary.raw! : undefined,
            author: CloudPullRequestApi.toUserModel(commit.author!.user!)
        }));
    }

    async deleteComment(site: BitbucketSite, prId: string, commentId: string): Promise<void> {
        const { ownerSlug, repoSlug } = site;

        await this.client.delete(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}/comments/${commentId}`,
            {}
        );
    }

    async editComment(site: BitbucketSite, prId: string, content: string, commentId: string): Promise<Comment> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.put(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}/comments/${commentId}`,
            {
                content: {
                    raw: content
                }
            }
        );

        return this.convertDataToComment(data, site);
    }

    async getTasks(pr: PullRequest): Promise<Task[]> {
        const { ownerSlug, repoSlug } = pr.site;

        //TODO: This is querying an internal API. Some day this API will hopefully be public, at which point we need to update this
        try {
            let { data } = await this.client.get(
                `https://api.bitbucket.org/internal/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/tasks`,
            );

            if (!data.values) {
                return [];
            }
    
            const accumulatedTasks = data.values as any[];
            while (data.next) {
                const nextPage = await this.client.get(data.next);
                data = nextPage.data;
                accumulatedTasks.push(...(data.values || []));
            }
    
            return accumulatedTasks.map((task: any) => this.convertDataToTask(task, pr.site));
        } catch (e) {
            return [];
        }
    }

    async postTask(site: BitbucketSite, prId: string, comment: Comment, content: string): Promise<Task> {
        const { ownerSlug, repoSlug } = site;

        try {
            const { data } = await this.client.post(
                `https://api.bitbucket.org/internal/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}/tasks/`,
                {
                    comment: {
                        id: comment.id
                    },
                    completed: false,
                    content: {
                        raw: content
                    }
                }
            );
    
            return this.convertDataToTask(data, site);
        } catch (e) {
            const error = new Error(`Error creating new task using interal API: ${e}`);
            Logger.error(error);
            throw error;
        }  
    }

    async editTask(site: BitbucketSite, prId: string, task: Task): Promise<Task> {
        const { ownerSlug, repoSlug } = site;

        try {
            const { data } = await this.client.put(
                `https://api.bitbucket.org/internal/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}/tasks/${task.id}`,
                {
                    comment: {
                        comment: task.commentId
                    },
                    completed: task.isComplete,
                    content: {
                        raw: task.content
                    },
                    id: task.id,
                    state: task.isComplete ? "RESOLVED" : "UNRESOLVED"
                }
            );

            return this.convertDataToTask(data, site);
        } catch (e) {
            const error = new Error(`Error editing task using interal API: ${e}`);
            Logger.error(error);
            throw error;
        }
    }

    async deleteTask(site: BitbucketSite, prId: string, task: Task): Promise<void> {
        const { ownerSlug, repoSlug } = site;

        try {
            await this.client.delete(
                `https://api.bitbucket.org/internal/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}/tasks/${task.id}`,
                {}  
            );
        } catch (e) {
            const error = new Error(`Error deleting task using interal API: ${e}`);
            Logger.error(error);
            throw error;
        }
    }

    convertDataToTask(taskData: any, site: BitbucketSite): Task {
        const taskBelongsToUser: boolean = taskData && taskData.creator && taskData.creator.account_id === site.details.userId;
        return {
            commentId: taskData.comment.id,
            creator: CloudPullRequestApi.toUserModel(taskData.creator),
            created: taskData.created_on,
            updated: taskData.updated_on,
            isComplete: taskData.state !== "UNRESOLVED",
            editable: taskBelongsToUser && taskData.state === "UNRESOLVED",
            deletable: taskBelongsToUser && taskData.state === "UNRESOLVED",
            id: taskData.id,
            content: taskData.content.raw
        };
    }

    async getComments(pr: PullRequest): Promise<PaginatedComments> {
        const { ownerSlug, repoSlug } = pr.site;

        const commentsAndTaskPromise = Promise.all([
            this.client.get(
                `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/comments`,
                {
                    pagelen: maxItemsSupported.comments
                }
            ),
            await this.getTasks(pr),
        ]);
        const [commentResp, tasks] = await commentsAndTaskPromise;
        let { data } = commentResp;

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
                },
                deleted: true
            } as any;
        });

        const convertedComments = await Promise.all(comments.map(commentData => (this.convertDataToComment(commentData, pr.site))));

        let commentIdMap = new Map<string, number>();
        for(let i = 0; i < convertedComments.length; i++){
            commentIdMap.set(convertedComments[i].id, i);
        }
        for(const task of tasks){
            const commentIndex = commentIdMap.get(task.commentId) as number;
            convertedComments[commentIndex].tasks.push(task);
        }

        const nestedComments = this.toNestedList(convertedComments);
        const visibleComments = nestedComments.filter(comment => this.shouldDisplayComment(comment));
        return {
            data: visibleComments,
            next: undefined
        };
    }

    private shouldDisplayComment(comment: Comment): boolean {
        let hasUndeletedChild: boolean = false;
        let filteredChildren = [];
        for (let child of comment.children) {
            hasUndeletedChild = hasUndeletedChild || this.shouldDisplayComment(child);
            if (hasUndeletedChild) {
                filteredChildren.push(child);
            }
        }
        comment.children = filteredChildren;
        return hasUndeletedChild || !comment.deleted || comment.tasks.some(task => !task.isComplete);
    }

    private toNestedList(comments: Comment[]): Comment[] {
        const commentsTreeMap = new Map<string, Comment>();
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
        const { ownerSlug, repoSlug } = pr.site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/statuses`,
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

    async getReviewers(site: BitbucketSite, query?: string): Promise<User[]> {
        const { ownerSlug, repoSlug } = site;

        let reviewers: any[] = [];
        if (!query) {
            const { data } = await this.client.get(
                `/repositories/${ownerSlug}/${repoSlug}/default-reviewers`,
                {
                    pagelen: maxItemsSupported.reviewers
                }
            );
            reviewers = data.values || [];
        } else {
            const { data } = await this.client.get(
                `/teams/${ownerSlug}/members?q=nickname="${query}"`
            );
            reviewers = data.values || [];
        }

        return reviewers.map(reviewer => CloudPullRequestApi.toUserModel(reviewer));
    }

    async create(site: BitbucketSite, workspaceRepo: WorkspaceRepo, createPrData: CreatePullRequestData): Promise<PullRequest> {
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

        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.post(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests`,
            prBody
        );

        return CloudPullRequestApi.toPullRequestData(data, site, workspaceRepo);
    }

    async update(pr: PullRequest, title: string) {
        const { ownerSlug, repoSlug } = pr.site;

        let prBody = {
            title: title
        };

        await this.client.put(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}`,
            prBody
        );
    }

    async updateApproval(pr: PullRequest, status: string) {
        const { ownerSlug, repoSlug } = pr.site;
        status === "APPROVED"
            ? await this.client.post(
                `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/approve`,
                {}
            )
            : await this.client.delete(
                `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/approve`,
                {}
            );
    }

    async merge(pr: PullRequest, closeSourceBranch?: boolean, mergeStrategy?: string, commitMessage?: string) {
        const { ownerSlug, repoSlug } = pr.site;

        let body = Object.create({});
        body = closeSourceBranch ? { ...body, close_source_branch: closeSourceBranch } : body;
        if (mergeStrategy !== undefined) {
            body = {
                ...body,
                merge_strategy: mergeStrategy,
                message: commitMessage
            };
        }

        await this.client.post(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/merge`,
            body
        );
    }

    async postComment(
        site: BitbucketSite,
        prId: string, text: string,
        parentCommentId?: string,
        inline?: { from?: number, to?: number, path: string }
    ): Promise<Comment> {
        const { ownerSlug, repoSlug } = site;

        prCommentEvent(site.details).then(e => { Container.analyticsClient.sendTrackEvent(e); });

        const { data } = await this.client.post(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}/comments`,
            {
                parent: parentCommentId ? { id: parentCommentId } : undefined,
                content: {
                    raw: text
                },
                inline: inline
            }
        );

        return this.convertDataToComment(data, site);
    }

    async getFileContent(site: BitbucketSite, commitHash: string, path: string): Promise<string> {
        const { ownerSlug, repoSlug } = site;

        const cacheKey = `${site.ownerSlug}::${site.repoSlug}::${commitHash}::${path}`;
        const cachedValue = this.fileContentCache.getItem<string>(cacheKey);
        if (cachedValue) {
            return cachedValue;
        }

        const { data } = await this.client.getRaw(
            `/repositories/${ownerSlug}/${repoSlug}/src/${commitHash}/${path}`
        );

        this.fileContentCache.setItem(cacheKey, data, 5 * Time.MINUTES);

        return data;
    }

    private convertDataToComment(data: any, site: BitbucketSite): Comment {
        const commentBelongsToUser: boolean = data && data.user && data.user.account_id === site.details.userId;

        return {
            id: data.id!,
            parentId: data.parent ? data.parent.id! : undefined,
            htmlContent: data.content!.html!,
            rawContent: data.content!.raw!,
            ts: data.created_on!,
            updatedTs: data.updated_on!,
            deleted: !!data.deleted,
            deletable: commentBelongsToUser && !data.deleted,
            editable: commentBelongsToUser && !data.deleted,
            inline: data.inline,
            user: data.user
                ? CloudPullRequestApi.toUserModel(data.user)
                : UnknownUser,
            children: [],
            tasks: []
        };
    }

    static toPullRequestData(pr: any, site: BitbucketSite, workspaceRepo?: WorkspaceRepo): PullRequest {
        const source = CloudPullRequestApi.toPullRequestRepo(pr.source);
        const destination = CloudPullRequestApi.toPullRequestRepo(pr.destination);

        return {
            site: site,
            workspaceRepo: workspaceRepo,
            data: {
                siteDetails: site.details,
                id: pr.id!,
                version: -1,
                url: pr.links!.html!.href!,
                author: CloudPullRequestApi.toUserModel(pr.author),
                reviewers: [],
                participants: (pr.participants || [])!.map((participant: any) => ({
                    ...CloudPullRequestApi.toUserModel(participant.user!),
                    role: participant.role!,
                    status: !!participant.approved ? 'APPROVED' : 'UNAPPROVED'
                })),
                source: source,
                destination: destination,
                title: pr.title!,
                htmlSummary: pr.summary ? pr.summary.html! : "",
                rawSummary: pr.summary ? pr.summary!.raw! : "",
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
