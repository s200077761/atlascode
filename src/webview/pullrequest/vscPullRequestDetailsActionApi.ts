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
    User,
} from '../../bitbucket/model';
import { Commands } from '../../commands';
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

    async deleteComment(pr: PullRequest, comment: Comment): Promise<Comment[]> {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.deleteComment(pr.site, pr.data.id, comment.id);
        const paginatedComments = await bbApi.pullrequests.getComments(pr);
        return paginatedComments.data;
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
}
