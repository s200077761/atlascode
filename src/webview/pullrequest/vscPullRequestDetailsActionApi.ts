import { isMinimalIssue, MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import axios, { CancelToken, CancelTokenSource } from 'axios';
import pSettle, { PromiseFulfilledResult } from 'p-settle';
import * as vscode from 'vscode';
import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { clientForSite } from '../../bitbucket/bbUtils';
import { extractBitbucketIssueKeys, extractIssueKeys } from '../../bitbucket/issueKeysExtractor';
import {
    ApprovalStatus,
    BitbucketIssue,
    BitbucketSite,
    BuildStatus,
    Comment,
    Commit,
    FileChange,
    FileDiff,
    isBitbucketIssue,
    MergeStrategy,
    PullRequest,
    Reviewer,
    Task,
    User,
} from '../../bitbucket/model';
import { Commands } from '../../commands';
import { showIssue } from '../../commands/jira/showIssue';
import { Container } from '../../container';
import { issueForKey } from '../../jira/issueForKey';
import { transitionIssue } from '../../jira/transitionIssue';
import { CancellationManager } from '../../lib/cancellation';
import { PullRequestDetailsActionApi } from '../../lib/webview/controller/pullrequest/pullRequestDetailsActionApi';
import { Logger } from '../../logger';
import { convertFileChangeToFileDiff, getArgsForDiffView } from '../../views/pullrequest/diffViewHelper';
import { addSourceRemoteIfNeeded } from '../../views/pullrequest/gitActions';

export class VSCPullRequestDetailsActionApi implements PullRequestDetailsActionApi {
    constructor(private cancellationManager: CancellationManager) {}

    async getCurrentUser(pr: PullRequest): Promise<User> {
        return await Container.bitbucketContext.currentUser(pr.site);
    }

    async getPR(pr: PullRequest): Promise<PullRequest> {
        const bbApi = await clientForSite(pr.site);

        return bbApi.pullrequests.get(pr.site, pr.data.id, pr.workspaceRepo);
    }

    async fetchUsers(site: BitbucketSite, query: string, abortKey?: string | undefined): Promise<User[]> {
        const client = await Container.clientManager.bbClient(site.details);

        var cancelToken: CancelToken | undefined = undefined;

        if (abortKey) {
            const signal: CancelTokenSource = axios.CancelToken.source();
            cancelToken = signal.token;
            this.cancellationManager.set(abortKey, signal);
        }

        return await client.pullrequests.getReviewers(site, query, cancelToken);
    }

    async updateSummary(pr: PullRequest, text: string): Promise<PullRequest> {
        const bbApi = await clientForSite(pr.site);
        return await bbApi.pullrequests.update(
            pr,
            pr.data.title,
            text,
            pr.data.participants.filter((p) => p.role === 'REVIEWER').map((p) => p.accountId)
        );
    }

    async updateTitle(pr: PullRequest, text: string): Promise<PullRequest> {
        const bbApi = await clientForSite(pr.site);
        const newPr = await bbApi.pullrequests.update(
            pr,
            text,
            pr.data.rawSummary,
            pr.data.participants.filter((p) => p.role === 'REVIEWER').map((p) => p.accountId)
        );

        vscode.commands.executeCommand(Commands.BitbucketRefreshPullRequests);
        return newPr;
    }

    async updateCommits(pr: PullRequest): Promise<Commit[]> {
        const bbApi = await clientForSite(pr.site);
        return await bbApi.pullrequests.getCommits(pr);
    }

    async updateReviewers(pr: PullRequest, newReviewers: User[]): Promise<Reviewer[]> {
        const bbApi = await clientForSite(pr.site);
        const { data } = await bbApi.pullrequests.update(
            pr,
            pr.data.title,
            pr.data.rawSummary,
            newReviewers.map((user) => user.accountId)
        );
        return data.participants;
    }

    async updateApprovalStatus(pr: PullRequest, status: ApprovalStatus): Promise<ApprovalStatus> {
        const bbApi = await clientForSite(pr.site);
        const newStatus = await bbApi.pullrequests.updateApproval(pr, status);
        return newStatus;
    }

    getCurrentBranchName(pr: PullRequest): string {
        let currentBranchName = '';
        if (pr.workspaceRepo) {
            const scm = Container.bitbucketContext.getRepositoryScm(pr.workspaceRepo!.rootUri)!;
            currentBranchName = scm.state.HEAD ? scm.state.HEAD.name! : '';
        }

        return currentBranchName;
    }

    async checkout(pr: PullRequest): Promise<string> {
        if (!pr.workspaceRepo) {
            throw new Error('no workspace repo');
        }

        await addSourceRemoteIfNeeded(pr);

        const scm = Container.bitbucketContext.getRepositoryScm(pr.workspaceRepo.rootUri)!;
        await scm.fetch();
        await scm.checkout(pr.data.source.branchName);
        if (scm.state.HEAD?.behind) {
            scm.pull();
        }

        //New current branch name
        return scm.state.HEAD?.name ?? '';
    }

    //Warning: This method has side effects
    private addToCommentHierarchy(comments: Comment[], commentToAdd: Comment): boolean {
        for (let i = 0; i < comments.length; i++) {
            if (comments[i].id === commentToAdd.parentId) {
                comments[i].children.push(commentToAdd);
                return true;
            } else if (this.addToCommentHierarchy(comments[i].children, commentToAdd)) {
                return true;
            }
        }
        return false;
    }

    private replaceCommentInHierarchy(comments: Comment[], updatedComment: Comment): [Comment[], boolean] {
        for (const comment of comments) {
            if (comment.id === updatedComment.id) {
                return [
                    comments.map((c) =>
                        c.id === updatedComment.id ? { ...updatedComment, children: c.children, tasks: c.tasks } : c
                    ),
                    true,
                ];
            } else {
                let success = false;
                [comment.children, success] = this.replaceCommentInHierarchy(comment.children, updatedComment);
                if (success) {
                    return [comments, success];
                }
            }
        }
        return [comments, false];
    }

    async getComments(pr: PullRequest): Promise<Comment[]> {
        const bbApi = await clientForSite(pr.site);
        const paginatedComments = await bbApi.pullrequests.getComments(pr);
        return paginatedComments.data;
    }

    async postComment(comments: Comment[], pr: PullRequest, rawText: string, parentId?: string): Promise<Comment[]> {
        const bbApi = await clientForSite(pr.site);
        const newComment: Comment = await bbApi.pullrequests.postComment(pr.site, pr.data.id, rawText, parentId);

        const updatedComments = comments.slice();
        if (newComment.parentId) {
            const success = this.addToCommentHierarchy(updatedComments, newComment);
            if (!success) {
                return await this.getComments(pr);
            }
        } else {
            updatedComments.push(newComment);
        }

        return updatedComments;
    }

    async editComment(comments: Comment[], pr: PullRequest, content: string, commentId: string): Promise<Comment[]> {
        const bbApi = await clientForSite(pr.site);
        const newComment: Comment = await bbApi.pullrequests.editComment(pr.site, pr.data.id, content, commentId);
        const [updatedComments, success] = this.replaceCommentInHierarchy(comments, newComment);
        return success ? updatedComments : await this.getComments(pr);
    }

    async deleteComment(pr: PullRequest, comment: Comment): Promise<Comment[]> {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.deleteComment(pr.site, pr.data.id, comment.id);
        return await this.getComments(pr);
    }

    //The difference between FileDiff and FileChange is documented in their model definitions
    async getFileDiffs(
        pr: PullRequest
    ): Promise<{ fileDiffs: FileDiff[]; diffsToChangesMap: Map<string, FileChange> }> {
        const bbApi = await clientForSite(pr.site);
        const fileChanges = await bbApi.pullrequests.getChangedFiles(pr);

        const diffsToChangesMap = new Map<string, FileChange>();
        const fileDiffs: FileDiff[] = [];
        fileChanges.forEach((fileChange) => {
            const fileDiff = convertFileChangeToFileDiff(fileChange);
            fileDiffs.push(fileDiff);
            diffsToChangesMap.set(fileDiff.file, fileChange);
        });

        return {
            fileDiffs: fileDiffs,
            diffsToChangesMap: diffsToChangesMap,
        };
    }

    async openDiffViewForFile(pr: PullRequest, fileChange: FileChange, comments: Comment[]): Promise<void> {
        const diffViewArgs = await getArgsForDiffView(
            { data: comments }, //Needs to be converted to PaginatedComment type
            fileChange,
            pr,
            Container.bitbucketContext.prCommentController
        );
        vscode.commands.executeCommand(Commands.ViewDiff, ...diffViewArgs.diffArgs);
    }

    async updateBuildStatuses(pr: PullRequest): Promise<BuildStatus[]> {
        const bbApi = await clientForSite(pr.site);
        return await bbApi.pullrequests.getBuildStatuses(pr);
    }

    async updateMergeStrategies(pr: PullRequest): Promise<MergeStrategy[]> {
        const bbApi = await clientForSite(pr.site);
        return await bbApi.pullrequests.getMergeStrategies(pr);
    }

    async fetchRelatedJiraIssues(
        pr: PullRequest,
        commits: Commit[],
        comments: Comment[]
    ): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        let foundIssues: MinimalIssue<DetailedSiteInfo>[] = [];
        try {
            if (Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
                const issueKeys = await extractIssueKeys(pr, commits, comments);
                const issueResults = await pSettle<MinimalIssue<DetailedSiteInfo>>(issueKeys.map(issueForKey));
                foundIssues = issueResults
                    .filter((result) => result.isFulfilled)
                    .map((result: PromiseFulfilledResult<MinimalIssue<DetailedSiteInfo>>) => result.value);
            }
        } catch (e) {
            foundIssues = [];
            Logger.debug('error fetching related jira issues: ', e);
        } finally {
            return foundIssues;
        }
    }

    async fetchRelatedBitbucketIssues(
        pr: PullRequest,
        commits: Commit[],
        comments: Comment[]
    ): Promise<BitbucketIssue[]> {
        let result: BitbucketIssue[] = [];
        try {
            const issueKeys = await extractBitbucketIssueKeys(pr, commits, comments);
            const bbApi = await clientForSite(pr.site);
            if (bbApi.issues) {
                result = await bbApi.issues.getIssuesForKeys(pr.site, issueKeys);
            }
        } catch (e) {
            result = [];
            Logger.debug('error fetching related bitbucket issues: ', e);
        }
        return result;
    }

    async merge(
        pr: PullRequest,
        mergeStrategy: MergeStrategy,
        commitMessage: string,
        closeSourceBranch: boolean,
        issues: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[]
    ): Promise<PullRequest> {
        const bbApi = await clientForSite(pr.site);
        const updatedPullRequest = await bbApi.pullrequests.merge(
            pr,
            closeSourceBranch,
            mergeStrategy.value,
            commitMessage
        );

        await this.updateIssues(issues);
        vscode.commands.executeCommand(Commands.BitbucketRefreshPullRequests);
        vscode.commands.executeCommand(Commands.RefreshPipelines);
        return updatedPullRequest;
    }

    private async updateIssues(issues?: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[]) {
        if (!issues) {
            return;
        }
        issues.forEach(async (issue) => {
            if (isMinimalIssue(issue)) {
                const transition = issue.transitions.find((t) => t.to.id === issue.status.id);
                if (transition) {
                    await transitionIssue(issue, transition);
                }
            } else if (isBitbucketIssue(issue)) {
                const bbApi = await clientForSite(issue.site);
                await bbApi.issues!.postChange(issue, issue.data.state!);
            }
        });
    }

    async openJiraIssue(issue: MinimalIssue<DetailedSiteInfo>) {
        await showIssue(issue);
    }
    async openBitbucketIssue(issue: BitbucketIssue) {
        await vscode.commands.executeCommand(Commands.ShowBitbucketIssue, issue);
    }

    async openBuildStatus(pr: PullRequest, status: BuildStatus) {
        if (status.url.includes('bitbucket.org') || status.url.includes('bb-inf.net')) {
            const pipelineUUID = status.url.substring(status.url.lastIndexOf('/') + 1);
            const bbApi = await clientForSite(pr.site);
            const pipeline = await bbApi.pipelines?.getPipeline(pr.site, pipelineUUID);

            if (pipeline) {
                vscode.commands.executeCommand(Commands.ShowPipeline, pipeline);
            } else {
                vscode.env.openExternal(vscode.Uri.parse(status.url));
            }
        } else {
            vscode.env.openExternal(vscode.Uri.parse(status.url));
        }
    }

    async getTasks(pr: PullRequest) {
        const bbApi = await clientForSite(pr.site);
        return await bbApi.pullrequests.getTasks(pr);
    }

    async createTask(
        tasks: Task[],
        comments: Comment[],
        pr: PullRequest,
        content: string,
        commentId?: string
    ): Promise<{ tasks: Task[]; comments: Comment[] }> {
        const bbApi = await clientForSite(pr.site);
        const task = await bbApi.pullrequests.postTask(pr.site, pr.data.id, content, commentId);
        //TODO: add analytics events
        //If the task belongs to a comment, add the task to the comment list
        const newTasks = tasks.slice();
        newTasks.push(task);
        if (commentId) {
            const updatedComments = comments.slice();
            if (this.addTaskToCommentHierarchy(updatedComments, task)) {
                return { tasks: newTasks, comments: comments };
            } else {
                //TODO: Currently gettings comments also fetches tasks and ties them together; this is very inefficient because it means
                //you need to get tasks again for non-comment tasks. This needs to be changed, but doing so will break existing PR code since it
                //depends on the PullRequestApi. For now, it's ok to assume this.getComments() will fill comments with tasks, but in the future
                //this assumption will be wrong.
                return { tasks: newTasks, comments: await this.getComments(pr) };
            }
        }
        return { tasks: newTasks, comments: comments };
    }

    //Warning: This method has side effects
    private addTaskToCommentHierarchy(comments: Comment[], task: Task): boolean {
        for (let i = 0; i < comments.length; i++) {
            if (comments[i].id === task.commentId) {
                comments[i].tasks.push(task);
                return true;
            } else if (this.addTaskToCommentHierarchy(comments[i].children, task)) {
                return true;
            }
        }
        return false;
    }

    private replaceTaskInTaskList(tasks: Task[], task: Task) {
        return tasks.map((t) => (t.id === task.id ? task : t));
    }

    private replaceTaskInCommentHierarchy(comments: Comment[], task: Task): boolean {
        for (let i = 0; i < comments.length; i++) {
            if (comments[i].id === task.commentId) {
                comments[i].tasks = this.replaceTaskInTaskList(comments[i].tasks, task);
                return true;
            } else if (this.replaceTaskInCommentHierarchy(comments[i].children, task)) {
                return true;
            }
        }
        return false;
    }

    async editTask(tasks: Task[], comments: Comment[], pr: PullRequest, task: Task) {
        const bbApi = await clientForSite(pr.site);
        const newTask = await bbApi.pullrequests.editTask(pr.site, pr.data.id, task);
        const newTasks = this.replaceTaskInTaskList(tasks, newTask);
        if (newTask.commentId) {
            const newComments = comments.slice();
            this.replaceTaskInCommentHierarchy(newComments, task);
            return { tasks: newTasks, comments: newComments };
        }
        return { tasks: newTasks, comments: comments };
    }

    async deleteTask(pr: PullRequest, task: Task): Promise<{ tasks: Task[]; comments: Comment[] }> {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.deleteTask(pr.site, pr.data.id, task);

        //TODO: This can almost certainly be converted to local deletion rather than
        //refetching comments.
        return { tasks: await this.getTasks(pr), comments: await this.getComments(pr) };
    }
}
