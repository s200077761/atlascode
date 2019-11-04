import { isMinimalIssue, MinimalIssue } from "jira-pi-client";
import pSettle from "p-settle";
import * as vscode from 'vscode';
import { prApproveEvent, prCheckoutEvent, prMergeEvent } from '../analytics';
import { DetailedSiteInfo, Product, ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { parseBitbucketIssueKeys } from '../bitbucket/bbIssueKeyParser';
import { bitbucketSiteForRemote, clientForRemote, clientForSite, siteDetailsForRemote } from '../bitbucket/bbUtils';
import { extractBitbucketIssueKeys, extractIssueKeys } from '../bitbucket/issueKeysExtractor';
import { ApprovalStatus, BitbucketIssue, Commit, FileChange, FileDiff, isBitbucketIssue, PaginatedComments, PullRequest } from '../bitbucket/model';
import { Commands } from '../commands';
import { showIssue } from '../commands/jira/showIssue';
import { Container } from '../container';
import { isOpenBitbucketIssueAction } from '../ipc/bitbucketIssueActions';
import { isOpenJiraIssue } from '../ipc/issueActions';
import { Action, onlineStatus } from '../ipc/messaging';
import { isCheckout, isDeleteComment, isEditComment, isFetchUsers, isMerge, isOpenBuildStatus, isOpenDiffView, isPostComment, isUpdateApproval, Merge } from '../ipc/prActions';
import { PRData } from '../ipc/prMessaging';
import { issueForKey } from '../jira/issueForKey';
import { parseJiraIssueKeys } from '../jira/issueKeyParser';
import { transitionIssue } from '../jira/transitionIssue';
import { Logger } from '../logger';
import { Remote, Repository } from "../typings/git";
import { PipelineInfo } from '../views/pipelines/PipelinesTree';
import { getArgsForDiffView } from '../views/pullrequest/diffViewHelper';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';

interface PRState {
    prData: PRData;
    remote?: Remote;
    sourceRemote?: Remote;
    repository?: Repository;
}

const emptyState: PRState = {
    prData: {
        type: '',
        fileDiffs: [],
        repoUri: '',
        remote: {
            name: 'dummy_remote',
            isReadOnly: true
        },
        currentBranch: '',
        relatedJiraIssues: [],
        mergeStrategies: []
    }
};
export class PullRequestWebview extends AbstractReactWebview implements InitializingWebview<PullRequest> {
    private _state: PRState = emptyState;
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
            return siteDetailsForRemote(this._pr.remote);
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

        if (!handled) {
            switch (msg.action) {
                case 'updateApproval': {
                    handled = true;
                    if (isUpdateApproval(msg)) {
                        try {
                            await this.updateApproval(msg.status);
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
                            await this.merge(msg);
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
                            await this.postComment(msg.content, msg.parentCommentId);
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
                            this.deleteComment(msg.commentId);
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
                            this.editComment(msg.content, msg.commentId);
                        } catch (e) {
                            Logger.error(new Error(`error editing comment on the pull request: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'checkout': {
                    if (isCheckout(msg)) {
                        handled = true;
                        try {
                            await this.checkout(msg.branch, msg.isSourceBranch);
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
                        await this.openDiffViewForFile(msg.fileChange);
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
                            vscode.commands.executeCommand(Commands.ShowPipeline, { site: bitbucketSiteForRemote(this._state.remote!), pipelineUuid: pipelineUUID } as PipelineInfo);
                        } else {
                            vscode.env.openExternal(vscode.Uri.parse(msg.buildStatusUri));
                        }
                    }
                    break;
                }
                case 'copyPullRequestLink': {
                    handled = true;
                    const linkUrl = this._state.prData.pr!.url;
                    await vscode.env.clipboard.writeText(linkUrl);
                    vscode.window.showInformationMessage(`Copied pull request link to clipboard - ${linkUrl}`);
                    break;
                }
                case 'fetchUsers': {
                    if (isFetchUsers(msg)) {
                        handled = true;
                        try {
                            const bbApi = await clientForRemote(msg.remote);
                            const reviewers = await bbApi.pullrequests.getReviewers(msg.remote, msg.query);
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

        const bbApi = await clientForRemote(this._pr.remote);
        const prDetailsPromises = Promise.all([
            bbApi.pullrequests.get(this._pr),
            bbApi.pullrequests.getCommits(this._pr),
            bbApi.pullrequests.getComments(this._pr),
            bbApi.pullrequests.getBuildStatuses(this._pr),
            bbApi.pullrequests.getMergeStrategies(this._pr),
            bbApi.pullrequests.getChangedFiles(this._pr)
        ]);
        const [updatedPR, commits, comments, buildStatuses, mergeStrategies, fileChanges] = await prDetailsPromises;
        const fileDiffs = fileChanges.map(fileChange => this.convertFileChangeToFileDiff(fileChange));
        this._pr = updatedPR;
        const issuesPromises = Promise.all([
            this.fetchRelatedJiraIssues(this._pr, commits, comments),
            this.fetchRelatedBitbucketIssues(this._pr, commits, comments),
            this.fetchMainIssue(this._pr)
        ]);

        const [relatedJiraIssues, relatedBitbucketIssues, mainIssue] = await issuesPromises;
        const currentUser = await Container.bitbucketContext.currentUser(this._pr.remote);
        this._state = {
            remote: this._pr.remote,
            sourceRemote: this._pr.sourceRemote,
            repository: this._pr.repository,
            prData: {
                pr: this._pr.data,
                fileDiffs: fileDiffs,
                repoUri: this._pr.repository.rootUri.toString(),
                remote: this._pr.remote,
                currentUser: currentUser,
                currentBranch: this._pr.repository.state.HEAD!.name!,
                type: 'update',
                commits: commits,
                comments: comments.data,
                relatedJiraIssues: relatedJiraIssues,
                relatedBitbucketIssues: relatedBitbucketIssues,
                mainIssue: mainIssue,
                buildStatuses: buildStatuses,
                mergeStrategies: mergeStrategies
            }
        };
        this.postMessage(this._state.prData);
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
            const site = bitbucketSiteForRemote(pr.remote)!;
            const bbApi = await clientForSite(site);
            if (bbApi.issues) {
                const bbIssues = await bbApi.issues.getIssuesForKeys(site, bbIssueKeys);
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
            const site = bitbucketSiteForRemote(pr.remote)!;
            const bbApi = await clientForSite(site);
            if (bbApi.issues) {
                result = await bbApi.issues.getIssuesForKeys(site, issueKeys);
            }
        } catch (e) {
            result = [];
            Logger.debug('error fetching related bitbucket issues: ', e);
        }
        return result;
    }

    private async updateApproval(status: ApprovalStatus) {
        const bbApi = await clientForRemote(this._state.remote!);
        await bbApi.pullrequests.updateApproval({ repository: this._state.repository!, remote: this._state.remote!, sourceRemote: this._state.sourceRemote, data: this._state.prData.pr! }, status);

        const site: DetailedSiteInfo | undefined = siteDetailsForRemote(this._state.remote!);

        if (site) {
            prApproveEvent(site).then(e => { Container.analyticsClient.sendTrackEvent(e); });
        }
        await this.updatePullRequest();
    }

    private async merge(m: Merge) {
        const bbApi = await clientForRemote(this._state.remote!);
        await bbApi.pullrequests.merge(
            { repository: this._state.repository!, remote: this._state.remote!, sourceRemote: this._state.sourceRemote, data: this._state.prData.pr! },
            m.closeSourceBranch,
            m.mergeStrategy,
            m.commitMessage
        );

        const site: DetailedSiteInfo | undefined = siteDetailsForRemote(this._state.remote!);

        if (site) {
            prMergeEvent(site).then(e => { Container.analyticsClient.sendTrackEvent(e); });
        }
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

    private async checkout(branch: string, isSourceBranch: boolean) {
        if (isSourceBranch && this._state.sourceRemote && this._state.sourceRemote !== this._state.remote) {
            // pull request is from a fork repository
            await this._state.repository!.getConfig(`remote.${this._state.sourceRemote!.name}.url`)
                .then(async url => {
                    if (!url) {
                        await this._state.repository!.addRemote(this._state.sourceRemote!.name, this._state.sourceRemote!.fetchUrl!);
                    }
                })
                .catch(async _ => {
                    await this._state.repository!.addRemote(this._state.sourceRemote!.name, this._state.sourceRemote!.fetchUrl!);
                });

            await this._state.repository!.fetch(this._state.sourceRemote!.name, this._state.prData.pr!.source!.branchName);
        }

        this._state.repository!.checkout(branch || this._state.prData.pr!.source!.branchName)
            .then(() => {
                this._state.prData.currentBranch = this._state.repository!.state.HEAD!.name!;
                this.postMessage({
                    type: 'checkout',
                    currentBranch: this._state.repository!.state.HEAD!.name!
                });
                const site: DetailedSiteInfo | undefined = siteDetailsForRemote(this._state.remote!);
                if (site) {
                    prCheckoutEvent(site).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                }
            })
            .catch((e: any) => {
                Logger.error(new Error(`error checking out the pull request branch: ${e}`));
                this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
            });
    }

    private async postComment(text: string, parentId?: number) {
        const bbApi = await clientForRemote(this._state.remote!);
        await bbApi.pullrequests.postComment(this._state.remote!, this._pr!.data.id, text, parentId);
        this.updatePullRequest();
    }

    private async deleteComment(commentId: number) {
        const bbApi = await clientForRemote(this._state.remote!);
        await bbApi.pullrequests.deleteComment(this._pr!.remote, this._pr!.data.id, commentId);
        this.updatePullRequest();
    }

    private async editComment(content: string, commentId: number) {
        const bbApi = await clientForRemote(this._state.remote!);
        await bbApi.pullrequests.editComment(this._state.remote!, this._pr!.data.id!, content, commentId);
        this.updatePullRequest();
    }

    private async openDiffViewForFile(fileChange: FileChange) {
        const pr: PullRequest = {
            repository: this._state.repository!,
            remote: this._state.remote!,
            sourceRemote: this._state.sourceRemote,
            data: this._state.prData.pr!
        };

        const diffViewArgs = await getArgsForDiffView(({ data: this._state.prData.comments } as PaginatedComments), fileChange, pr, Container.bitbucketContext.prCommentController);
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
