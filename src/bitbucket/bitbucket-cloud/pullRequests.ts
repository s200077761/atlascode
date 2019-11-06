import { Repository, Remote } from "../../typings/git";
import { PullRequest, PaginatedPullRequests, PaginatedComments, Comment, UnknownUser, BuildStatus, CreatePullRequestData, PullRequestApi, User, MergeStrategy, Commit, FileChange, FileStatus, Task } from '../model';
import { Container } from "../../container";
import { prCommentEvent } from '../../analytics';
import { parseGitUrl, urlForRemote, siteDetailsForRemote } from "../bbUtils";
import { CloudRepositoriesApi } from "./repositories";
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { Client, ClientError } from "../httpClient";
import { AxiosResponse } from "axios";
import { getAgent } from "../../atlclients/agent";

export const maxItemsSupported = {
    commits: 100,
    comments: 100,
    reviewers: 100,
    buildStatuses: 100
};
export const defaultPagelen = 25;
const dummyRemote = { name: '', isReadOnly: true };
const mergeStrategyLabels = {
    'merge_commit': 'Merge commit',
    'squash': 'Squash',
    'fast_forward': 'Fast forward'
};

export class CloudPullRequestApi implements PullRequestApi {
    private client: Client;

    constructor(site: DetailedSiteInfo, token: string) {
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

    async getList(repository: Repository, remote: Remote, queryParams?: { pagelen?: number, sort?: string, q?: string }): Promise<PaginatedPullRequests> {
        let parsed = parseGitUrl(remote.fetchUrl! || remote.pushUrl!);

        const { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests`,
            {
                pagelen: defaultPagelen,
                fields: '+values.participants',
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
            { q: `state="OPEN" and author.account_id="${siteDetailsForRemote(remote)!.userId}"` });
    }

    async getListToReview(repository: Repository, remote: Remote): Promise<PaginatedPullRequests> {
        return this.getList(
            repository,
            remote,
            { q: `state="OPEN" and reviewers.account_id="${siteDetailsForRemote(remote)!.userId}"` });
    }

    async nextPage({ repository, remote, next }: PaginatedPullRequests): Promise<PaginatedPullRequests> {
        const { data } = await this.client.getURL(next!);

        const prs = (data).values!.map((pr: any) => CloudPullRequestApi.toPullRequestData(repository, remote, pr));
        return { repository: repository, remote: remote, data: prs, next: data.next };
    }

    async getLatest(repository: Repository, remote: Remote): Promise<PaginatedPullRequests> {
        return this.getList(
            repository,
            remote,
            { pagelen: 2, sort: '-created_on', q: `state="OPEN" and reviewers.account_id="${siteDetailsForRemote(remote)!.userId}"` });
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

    async getMergeStrategies(pr: PullRequest): Promise<MergeStrategy[]> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        const { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}`,
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
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        let { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/diffstat`,
        );

        if (!data.values) {
            return [];
        }

        const accumulatedDiffStats = data.values as any[];
        while (data.next) {
            const nextPage = await this.client.getURL(data.next);
            data = nextPage.data;
            accumulatedDiffStats.push(...(data.values || []));
        }

        return accumulatedDiffStats.map(diffStat => ({
            linesAdded: diffStat.lines_added ? diffStat.lines_added : 0,
            linesRemoved: diffStat.lines_removed ? diffStat.lines_removed : 0,
            status: this.mapStatusWordsToFileStatus(diffStat.status!),
            oldPath: diffStat.old ? diffStat.old.path! : undefined,
            newPath: diffStat.new ? diffStat.new.path! : undefined
        }));
    }

    private mapStatusWordsToFileStatus(status: string): FileStatus {
        if(status === 'added') {
            return FileStatus.ADDED;
        } else if(status === 'removed') {
            return FileStatus.DELETED;
        } else if(status === 'modified') {
            return FileStatus.MODIFIED;
        } else if(status === 'renamed') {
            return FileStatus.RENAMED;
        } else if(status === 'merge conflict') {
            return FileStatus.CONFLICT;
        } else {
            return FileStatus.UNKNOWN;
        }
    }

    async getCommits(pr: PullRequest): Promise<Commit[]> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        let { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/commits`,
            {
                pagelen: maxItemsSupported.commits
            }
        );

        if (!data.values) {
            return [];
        }

        const accumulatedCommits = data.values as any[];
        while (data.next) {
            const nextPage = await this.client.getURL(data.next);
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

    async deleteComment(remote: Remote, prId: number, commentId: number): Promise<void> {
        let parsed = parseGitUrl(urlForRemote(remote));
        await this.client.delete(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${prId}/comments/${commentId}`,
            {}
        );
    }

    async editComment(remote: Remote, prId: number, content: string, commentId: number): Promise<Comment> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const { data } = await this.client.put(
            `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${prId}/comments/${commentId}`,
            {
                content: {
                    raw: content
                }
            }
        );

        return this.convertDataToComment(data, remote);
    }

    async getTasks(pr: PullRequest): Promise<Task[]> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

        //TODO: This is querying an internal API. Some day this API will hopefully be public, at which point we need to update this
        let { data } = await this.client.getURL(
            `https://api.bitbucket.org/internal/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/tasks`,
        );

        if (!data.values) {
            return [];
        }

        const accumulatedTasks = data.values as any[];
        while (data.next) {
            const nextPage = await this.client.getURL(data.next);
            data = nextPage.data;
            accumulatedTasks.push(...(data.values || []));
        }

        return accumulatedTasks.map((task: any) => this.convertDataToTask(task, pr.remote));
    }

    async postTask(pr: PullRequest, comment: Comment, content: string): Promise<Task> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const { data } = await this.client.postURL(
            `https://bitbucket.org/!api/internal/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/tasks/`,
            {
                comment: {
                    id: comment.id
                },
                completed: false,
                content: {
                    raw: content
                },
                creator: {
                    account_id: comment.user.accountId //TODO: Check that this actually works (example on web sends UUID not account_id)
                }
            }
        );

        return this.convertDataToTask(data, pr.remote);
    }

    async editTask(pr: PullRequest, task: Task): Promise<Task> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        const { data } = await this.client.putURL(
            `https://bitbucket.org/!api/internal/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/tasks/${task.id}`,
            {
                comment: {
                    comment: task.commentId
                },
                completed: task.isComplete,
                content: {
                    raw: task.content.raw
                },
                creator: {
                    display_name: task.creator.displayName,
                    links: {
                        avatar: {
                            href: task.creator.avatarUrl
                        },
                        self: {
                            href: task.creator.url
                        }
                    },
                    account_id: task.creator.accountId //TODO: Check that this actually works (example on web sends UUID not account_id)
                },
                id: task.id,
                state: task.isComplete ? "RESOLVED" : "UNRESOLVED"
            }
        );

        return this.convertDataToTask(data, pr.remote);
    }

    async deleteTask(pr: PullRequest, task: Task): Promise<void> {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        await this.client.deleteURL(
            `https://bitbucket.org/!api/internal/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/tasks/${task.id}`,
            {}  
        );
    }

    convertDataToTask(taskData: any, remote: Remote): Task {
        const taskBelongsToUser: boolean = this.commentBelongsToUser(remote, taskData.creator.account_id);
        return {
            commentId: taskData.comment.id,
            creator: CloudPullRequestApi.toUserModel(taskData.creator),
            created: taskData.created_on,
            updated: taskData.updated_on,
            isComplete: taskData.state !== "UNRESOLVED",
            editable: taskBelongsToUser,
            deletable: taskBelongsToUser,
            id: taskData.id,
            content: taskData.content
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
            const nextPage = await this.client.getURL(data.next);
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

        //TODO: This should not be an await statement. We should do promises for the comment data and this at the same time for efficiency reasons...
        const convertedComments = await Promise.all(comments.map(commentData => (this.convertDataToComment(commentData, pr.remote))));
        const tasks: Task[] = await this.getTasks(pr); 
        let commentIdMap = new Map<number, number>();
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

    private containsUnfinishedTask(tasks: Task[]){
        for(const task of tasks) {
            if(!task.isComplete) {
                return true;
            }
        }
        return false;
    }

    private shouldDisplayComment(comment: Comment): boolean {
        if (!comment.deleted || this.containsUnfinishedTask(comment.tasks)) {
            return true;
        } else if (!comment.children || comment.children.length === 0) {
            return false;
        } else {
            let hasUndeletedChild: boolean = false;
            for (let child of comment.children) {
                hasUndeletedChild = hasUndeletedChild || this.shouldDisplayComment(child);
                if (hasUndeletedChild) {
                    return hasUndeletedChild;
                }
            }
            return hasUndeletedChild;
        }
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

    async getReviewers(remote: Remote, query?: string): Promise<User[]> {
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
                `/teams/${parsed.owner}/members?q=nickname="${query}"`
            );
            reviewers = data.values || [];
        }

        return reviewers.map(reviewer => CloudPullRequestApi.toUserModel(reviewer));
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

    async updateApproval(pr: PullRequest, status: string) {
        let parsed = parseGitUrl(urlForRemote(pr.remote));
        status === "APPROVED"
            ? await this.client.post(
                `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/approve`,
                {}
            )
            : await this.client.delete(
                `/repositories/${parsed.owner}/${parsed.name}/pullrequests/${pr.data.id}/approve`,
                {}
            );
    }

    async merge(pr: PullRequest, closeSourceBranch?: boolean, mergeStrategy?: string, commitMessage?: string) {
        let parsed = parseGitUrl(urlForRemote(pr.remote));

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

        const site: DetailedSiteInfo | undefined = siteDetailsForRemote(remote);
        if (site) {
            prCommentEvent(site).then(e => { Container.analyticsClient.sendTrackEvent(e); });
        }

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

        return await this.convertDataToComment(data, remote);
    }

    private commentBelongsToUser(remote: Remote, accountId: string): boolean {
        const site = siteDetailsForRemote(remote);
        return !!site && accountId === site.userId;
    }

    private async convertDataToComment(data: any, remote: Remote): Promise<Comment> {
        const commentBelongsToUser: boolean = (data && data.user && this.commentBelongsToUser(remote, data.user.account_id)) ? true : false;

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
                siteDetails: siteDetailsForRemote(remote)!,
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
