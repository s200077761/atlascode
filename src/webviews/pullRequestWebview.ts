import { isMinimalIssue, MinimalIssue } from "jira-pi-client";
import pSettle from "p-settle";
import { PRData } from "src/ipc/prMessaging";
import * as vscode from 'vscode';
import { prApproveEvent, prCheckoutEvent, prMergeEvent } from '../analytics';
import { DetailedSiteInfo, Product, ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { parseBitbucketIssueKeys } from '../bitbucket/bbIssueKeyParser';
import { clientForSite, parseGitUrl, urlForRemote } from '../bitbucket/bbUtils';
import { extractBitbucketIssueKeys, extractIssueKeys } from '../bitbucket/issueKeysExtractor';
import { ApprovalStatus, BitbucketIssue, Commit, FileChange, FileDiff, isBitbucketIssue, PaginatedComments, PullRequest, Task } from '../bitbucket/model';
import { Commands } from '../commands';
import { showIssue } from '../commands/jira/showIssue';
import { Container } from '../container';
import { isOpenBitbucketIssueAction } from '../ipc/bitbucketIssueActions';
import { isOpenJiraIssue } from '../ipc/issueActions';
import { Action, onlineStatus } from '../ipc/messaging';
import { isCheckout, isCreateTask, isDeleteComment, isDeleteTask, isEditComment, isEditTask, isFetchUsers, isMerge, isOpenBuildStatus, isOpenDiffView, isPostComment, isUpdateApproval, isUpdateTitle, Merge } from '../ipc/prActions';
import { issueForKey } from '../jira/issueForKey';
import { parseJiraIssueKeys } from '../jira/issueKeyParser';
import { transitionIssue } from '../jira/transitionIssue';
import { Logger } from '../logger';
import { PipelineInfo } from '../views/pipelines/PipelinesTree';
import { getArgsForDiffView } from '../views/pullrequest/diffViewHelper';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';

export class PullRequestWebview extends AbstractReactWebview implements InitializingWebview<PullRequest> {
    private _pr: PullRequest | undefined = undefined;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        if (this._pr && this._pr.data) {
            return `Pull Request #${this._pr.data.id}`;
        }

        return "Pull Request";
    }
    public get id(): string {
        return "pullRequestDetailsScreen";
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        if (this._pr) {
            return this._pr.site.details;
        }

        return undefined;
    }

    public get productOrUndefined(): Product | undefined {
        return ProductBitbucket;
    }

    initialize(data: PullRequest) {
        this._pr = data;

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        Container.pmfStats.touchActivity();
    }

    public async invalidate() {
        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        if (this._pr && this._panel) {
            await this.updatePullRequest();
        }
    }

    protected async onMessageReceived(msg: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(msg);

        if (!this._pr) {
            Logger.error(new Error('no pull request for this webview'));
            return handled;
        }

        if (!handled) {
            switch (msg.action) {
                case 'updateTitle': {
                    handled = true;
                    if (isUpdateTitle(msg)) {
                        try {
                            await this.updateTitle(this._pr, msg.text);
                        } catch (e) {
                            Logger.error(new Error(`error updating pull request title: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'updateApproval': {
                    handled = true;
                    if (isUpdateApproval(msg)) {
                        try {
                            await this.updateApproval(this._pr, msg.status);
                        } catch (e) {
                            Logger.error(new Error(`error approving PR: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'merge': {
                    handled = true;
                    if (isMerge(msg)) {
                        try {
                            await this.merge(this._pr, msg);
                        } catch (e) {
                            Logger.error(new Error(`error merging pull request: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'comment': {
                    if (isPostComment(msg)) {
                        handled = true;
                        try {
                            await this.postComment(this._pr, msg.content, msg.parentCommentId);
                        } catch (e) {
                            Logger.error(new Error(`error posting comment on the pull request: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'deleteComment': {
                    if (isDeleteComment(msg)) {
                        try {
                            this.deleteComment(this._pr, msg.commentId);
                        } catch (e) {
                            Logger.error(new Error(`error deleting comment on the pull request: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'editComment': {
                    if (isEditComment(msg)) {
                        try {
                            this.editComment(this._pr, msg.content, msg.commentId);
                        } catch (e) {
                            Logger.error(new Error(`error editing comment on the pull request: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'createTask': {
                    if(isCreateTask(msg)){
                        try {
                            this.createTask(this._pr, msg.task, msg.commentId);
                        } catch (e) {
                            Logger.error(new Error(`error creating task on the pull request: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'editTask': {
                    if(isEditTask(msg)){
                        try {
                            this.editTask(this._pr, msg.task);
                        } catch (e) {
                            Logger.error(new Error(`error editing task on the pull request: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'deleteTask': {
                    if(isDeleteTask(msg)){
                        try {
                            this.deleteTask(this._pr, msg.task);
                        } catch (e) {
                            Logger.error(new Error(`error deleting task on the pull request: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'checkout': {
                    if (isCheckout(msg)) {
                        handled = true;
                        try {
                            await this.checkout(this._pr, msg.branch, msg.isSourceBranch);
                        } catch (e) {
                            Logger.error(new Error(`error checking out the branch: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'refreshPR': {
                    handled = true;
                    this.invalidate();
                    break;
                }
                case 'openJiraIssue': {
                    if (isOpenJiraIssue(msg)) {
                        handled = true;
                        showIssue(msg.issueOrKey);
                    }
                    break;
                }
                case 'openDiffView': {
                    if (isOpenDiffView(msg)) {
                        await this.openDiffViewForFile(this._pr, msg.fileChange);
                    }
                    break;
                }
                case 'openBitbucketIssue': {
                    if (isOpenBitbucketIssueAction(msg)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.ShowBitbucketIssue, msg.issue);
                    }
                    break;
                }
                case 'openBuildStatus': {
                    if (isOpenBuildStatus(msg)) {
                        handled = true;
                        if (msg.buildStatusUri.includes('bitbucket.org') || msg.buildStatusUri.includes('bb-inf.net')) {
                            const pipelineUUID = msg.buildStatusUri.substring(msg.buildStatusUri.lastIndexOf('/') + 1);
                            vscode.commands.executeCommand(Commands.ShowPipeline, { site: this._pr.site, pipelineUuid: pipelineUUID } as PipelineInfo);
                        } else {
                            vscode.env.openExternal(vscode.Uri.parse(msg.buildStatusUri));
                        }
                    }
                    break;
                }
                case 'copyPullRequestLink': {
                    handled = true;
                    const linkUrl = this._pr.data.url;
                    await vscode.env.clipboard.writeText(linkUrl);
                    vscode.window.showInformationMessage(`Copied pull request link to clipboard - ${linkUrl}`);
                    break;
                }
                case 'fetchUsers': {
                    if (isFetchUsers(msg)) {
                        handled = true;
                        try {
                            const bbApi = await clientForSite(this._pr.site);
                            const reviewers = await bbApi.pullrequests.getReviewers(this._pr.site, msg.query);
                            if (reviewers.length === 0) {
                                reviewers.push(...this._pr!.data.participants);
                            }
                            this.postMessage({ type: 'fetchUsersResult', users: reviewers });
                        } catch (e) {
                            Logger.error(new Error(`error fetching reviewers: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
            }
        }

        return handled;
    }

    private async updatePullRequest() {
        if (this.isRefeshing) {
            return;
        }
        try {
            this.isRefeshing = true;
            await this.postCompleteState();
        } catch (e) {
            let err = new Error(`error updating pull request: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
        } finally {
            this.isRefeshing = false;
        }
    }

    private async postCompleteState() {
        if (!this._pr || !this._panel) {
            return;
        }
        if (this._panel) { this._panel.title = `Pull Request #${this._pr.data.id}`; }

        const bbApi = await clientForSite(this._pr.site);
        const prDetailsPromises = Promise.all([
            bbApi.pullrequests.get(this._pr),
            bbApi.pullrequests.getCommits(this._pr),
            bbApi.pullrequests.getComments(this._pr),
            bbApi.pullrequests.getBuildStatuses(this._pr),
            bbApi.pullrequests.getMergeStrategies(this._pr),
            bbApi.pullrequests.getChangedFiles(this._pr),
            bbApi.pullrequests.getTasks(this._pr)
        ]);
        const [updatedPR, commits, comments, buildStatuses, mergeStrategies, fileChanges, tasks] = await prDetailsPromises;
        const fileDiffs = fileChanges.map(fileChange => this.convertFileChangeToFileDiff(fileChange));
        this._pr = updatedPR;
        const issuesPromises = Promise.all([
            this.fetchRelatedJiraIssues(this._pr, commits, comments),
            this.fetchRelatedBitbucketIssues(this._pr, commits, comments),
            this.fetchMainIssue(this._pr)
        ]);

        const [relatedJiraIssues, relatedBitbucketIssues, mainIssue] = await issuesPromises;
        const currentUser = await Container.bitbucketContext.currentUser(this._pr.site);

        let currentBranch = '';
        if (this._pr.workspaceRepo) {
            const scm = Container.bitbucketContext.getRepositoryScm(this._pr.workspaceRepo!.rootUri)!;
            currentBranch = scm.state.HEAD ? scm.state.HEAD.name! : '';
        }

        const prData: PRData = {
            pr: this._pr,
            fileDiffs: fileDiffs,
            currentUser: currentUser,
            currentBranch: currentBranch,
            type: 'update',
            commits: commits,
            comments: comments.data,
            tasks: tasks,
            relatedJiraIssues: relatedJiraIssues,
            relatedBitbucketIssues: relatedBitbucketIssues,
            mainIssue: mainIssue,
            buildStatuses: buildStatuses,
            mergeStrategies: mergeStrategies
        };
        this.postMessage(prData);
    }

    private async fetchMainIssue(pr: PullRequest): Promise<MinimalIssue<DetailedSiteInfo> | BitbucketIssue | undefined> {
        try {
            const branchAndTitleText = `${pr.data.source!.branchName} ${pr.data.title!}`;

            if (Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
                const jiraIssueKeys = parseJiraIssueKeys(branchAndTitleText);
                if (jiraIssueKeys.length > 0) {
                    try {
                        return await issueForKey(jiraIssueKeys[0]);
                    } catch (e) {
                        Logger.debug('error fetching main jira issue: ', e);
                    }
                }
            }

            const bbIssueKeys = parseBitbucketIssueKeys(branchAndTitleText);
            const bbApi = await clientForSite(pr.site);
            if (bbApi.issues) {
                const bbIssues = await bbApi.issues.getIssuesForKeys(pr.site, bbIssueKeys);
                if (bbIssues.length > 0) {
                    return bbIssues[0];
                }
            }
        } catch (e) {
            Logger.debug('error fetching main jira issue: ', e);
        }
        return undefined;
    }

    private async fetchRelatedJiraIssues(pr: PullRequest, commits: Commit[], comments: PaginatedComments): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        let foundIssues: MinimalIssue<DetailedSiteInfo>[] = [];
        try {
            if (Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
                const issueKeys = await extractIssueKeys(pr, commits, comments.data);

                const jqlPromises: Promise<MinimalIssue<DetailedSiteInfo>>[] = [];
                issueKeys.forEach(key => {
                    jqlPromises.push(
                        (async () => {
                            return await issueForKey(key);
                        })()
                    );
                });

                let issueResults = await pSettle<MinimalIssue<DetailedSiteInfo>>(jqlPromises);

                issueResults.forEach(result => {
                    if (result.isFulfilled) {
                        foundIssues.push(result.value);
                    }
                });
            }
        } catch (e) {
            foundIssues = [];
            Logger.debug('error fetching related jira issues: ', e);
        }
        return foundIssues;
    }

    private async fetchRelatedBitbucketIssues(pr: PullRequest, commits: Commit[], comments: PaginatedComments): Promise<BitbucketIssue[]> {
        let result: BitbucketIssue[] = [];
        try {
            const issueKeys = await extractBitbucketIssueKeys(pr, commits, comments.data);
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

    private async updateTitle(pr: PullRequest, text: string) {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.update(pr, text);

        vscode.commands.executeCommand(Commands.BitbucketRefreshPullRequests);
    }

    private async updateApproval(pr: PullRequest, status: ApprovalStatus) {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.updateApproval(pr, status);

        prApproveEvent(pr.site.details).then(e => { Container.analyticsClient.sendTrackEvent(e); });
        await this.updatePullRequest();
    }

    private async merge(pr: PullRequest, m: Merge) {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.merge(
            pr,
            m.closeSourceBranch,
            m.mergeStrategy,
            m.commitMessage
        );

        prMergeEvent(pr.site.details).then(e => { Container.analyticsClient.sendTrackEvent(e); });
        await this.updateIssue(m.issue);
        vscode.commands.executeCommand(Commands.BitbucketRefreshPullRequests);
        vscode.commands.executeCommand(Commands.RefreshPipelines);
        await this.updatePullRequest();
    }

    private async updateIssue(issue?: MinimalIssue<DetailedSiteInfo> | BitbucketIssue) {
        if (!issue) {
            return;
        }
        if (isMinimalIssue(issue)) {
            const transition = issue.transitions.find(t => t.to.id === issue.status.id);
            if (transition) {
                await transitionIssue(issue, transition);
            }
        } else if (isBitbucketIssue(issue)) {
            const bbApi = await clientForSite(issue.site);
            await bbApi.issues!.postChange(issue, issue.data.state!);
        }
    }

    private async checkout(pr: PullRequest, branch: string, isSourceBranch: boolean) {
        if (!pr.workspaceRepo) {
            Logger.error(new Error('error checking out the pull request branch: no workspace repo'));
            this.postMessage({ type: 'error', reason: this.formatErrorReason('error checking out the pull request branch: no workspace repo') });
            return;
        }

        const scm = Container.bitbucketContext.getRepositoryScm(pr.workspaceRepo.rootUri)!;

        // Add source remote (if necessary) if pull request is from a fork repository
        if (pr.data.source.repo.url !== '' && pr.data.source.repo.url !== pr.data.destination.repo.url) {
            const parsed = parseGitUrl(urlForRemote(pr.workspaceRepo.mainSiteRemote.remote));
            const sourceRemote = {
                fetchUrl: parseGitUrl(pr.data.source.repo.url).toString(parsed.protocol),
                name: pr.data.source.repo.fullName,
                isReadOnly: true
            };

            await scm.getConfig(`remote.${sourceRemote.name}.url`)
                .then(async url => {
                    if (!url) {
                        await scm.addRemote(sourceRemote.name, sourceRemote.fetchUrl!);
                    }
                })
                .catch(async _ => {
                    await scm.addRemote(sourceRemote.name, sourceRemote.fetchUrl!);
                });

            await scm.fetch(sourceRemote.name, pr.data.source.branchName);
        }

        scm.checkout(branch || pr.data.source.branchName)
            .then(() => {
                const currentBranch = scm.state.HEAD ? scm.state.HEAD.name : '';
                this.postMessage({
                    type: 'checkout',
                    currentBranch: currentBranch
                });
                prCheckoutEvent(pr.site.details).then(e => { Container.analyticsClient.sendTrackEvent(e); });
            })
            .catch((e: any) => {
                Logger.error(new Error(`error checking out the pull request branch: ${e}`));
                this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
            });
    }

    private async postComment(pr: PullRequest, text: string, parentId?: string) {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.postComment(pr.site, pr.data.id, text, parentId);
        this.updatePullRequest();
    }

    private async deleteComment(pr: PullRequest, commentId: string) {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.deleteComment(pr.site, this._pr!.data.id, commentId);
        this.updatePullRequest();
    }

    private async editComment(pr: PullRequest, content: string, commentId: string) {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.editComment(pr.site, this._pr!.data.id!, content, commentId);
        this.updatePullRequest();
    }

    private async createTask(pr: PullRequest, task: Task, commentId?: string) {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.postTask(pr.site, pr.data.id, task.content, commentId);
        this.updatePullRequest();
    }

    private async editTask(pr: PullRequest, task: Task) {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.editTask(pr.site, pr.data.id, task);
        this.updatePullRequest();
    }

    private async deleteTask(pr: PullRequest, task: Task) {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.deleteTask(pr.site, pr.data.id, task);
        this.updatePullRequest();
    }

    private async openDiffViewForFile(pr: PullRequest, fileChange: FileChange) {
        const bbApi = await clientForSite(pr.site);
        const comments = await bbApi.pullrequests.getComments(pr);
        const diffViewArgs = await getArgsForDiffView(comments, fileChange, pr, Container.bitbucketContext.prCommentController);
        vscode.commands.executeCommand(Commands.ViewDiff, ...diffViewArgs.diffArgs);
    }

    private convertFileChangeToFileDiff(fileChange: FileChange): FileDiff {
        return {
            file: this.getFileNameFromPaths(fileChange.oldPath, fileChange.newPath),
            status: fileChange.status,
            linesAdded: fileChange.linesAdded,
            linesRemoved: fileChange.linesRemoved,
            fileChange: fileChange
        };
    }

    private getFileNameFromPaths(oldPath: string | undefined, newPath: string | undefined): string {
        let fileDisplayName: string = '';
        if (newPath && oldPath && newPath !== oldPath) {
            fileDisplayName = `${oldPath} → ${newPath}`; //This is actually not what we want, but it'll have to be dealt with later...
        } else if (newPath) {
            fileDisplayName = newPath;
        } else if (oldPath) {
            fileDisplayName = oldPath;
        }
        return fileDisplayName;
    }

}
