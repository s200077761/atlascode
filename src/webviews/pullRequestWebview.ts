import * as vscode from 'vscode';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { PullRequest, PaginatedComments } from '../bitbucket/model';
import { PullRequestApi, GitUrlParse } from '../bitbucket/pullRequests';
import { PRData, CheckoutResult } from '../ipc/prMessaging';
import { Action, HostErrorMessage, onlineStatus } from '../ipc/messaging';
import { Logger } from '../logger';
import { Repository, Remote } from "../typings/git";
import { isPostComment, isCheckout } from '../ipc/prActions';
import { isOpenJiraIssue } from '../ipc/issueActions';
import { fetchIssue } from '../jira/fetchIssue';
import { Commands } from '../commands';
import { Issue } from '../jira/jiraModel';
import { extractIssueKeys, extractBitbucketIssueKeys } from '../bitbucket/issueKeysExtractor';
import { prCheckoutEvent, prApproveEvent, prMergeEvent } from '../analytics';
import { Container } from '../container';
import { RepositoriesApi } from '../bitbucket/repositories';
import { isOpenPipelineBuild } from '../ipc/pipelinesActions';
import { BitbucketIssuesApi } from '../bitbucket/bbIssues';
import { isOpenBitbucketIssueAction } from '../ipc/bitbucketIssueActions';

interface PRState {
    prData: PRData;
    remote?: Remote;
    sourceRemote?: Remote;
    repository?: Repository;
}

const emptyState: PRState = { prData: { type: '', currentBranch: '', relatedJiraIssues: [] } };
type Emit = PRData | CheckoutResult | HostErrorMessage;
export class PullRequestWebview extends AbstractReactWebview<Emit, Action> implements InitializingWebview<PullRequest> {
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

    initialize(data: PullRequest) {
        this._pr = data;

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        this.updatePullRequest(data);
    }

    public async invalidate() {
        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        if (this._state.repository && this._state.remote && this._state.prData.pr) {
            this.forceUpdatePullRequest();
        } else if (this._pr !== undefined) {
            await this.postInitialState(this._pr);
            await this.postAugmentedState(this._pr);
        }
    }

    private validatePRState(s: PRState): boolean {
        return !!s.repository
            && !!s.remote
            && !!s.prData.pr
            && !!s.prData.currentUser
            && !!s.prData.commits
            && !!s.prData.comments;
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if (!handled) {
            switch (e.action) {
                case 'approve': {
                    handled = true;
                    try {
                        await this.approve();
                    } catch (e) {
                        Logger.error(new Error(`error approving PR: ${e}`));
                        this.postMessage({ type: 'error', reason: e });
                    }
                    break;
                }
                case 'merge': {
                    handled = true;
                    try {
                        await this.merge();
                    } catch (e) {
                        Logger.error(new Error(`error merging pull request: ${e}`));
                        this.postMessage({ type: 'error', reason: e });
                    }
                    break;
                }
                case 'comment': {
                    if (isPostComment(e)) {
                        handled = true;
                        try {
                            await this.postComment(e.content, e.parentCommentId);
                        } catch (e) {
                            Logger.error(new Error(`error posting comment on the pull request: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'checkout': {
                    if (isCheckout(e)) {
                        handled = true;
                        try {
                            await this.checkout(e.branch, e.isSourceBranch);
                        } catch (e) {
                            Logger.error(new Error(`error checking out the branch: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
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
                    if (isOpenJiraIssue(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.ShowIssue, e.issueOrKey);
                        break;
                    }
                }
                case 'openBitbucketIssue': {
                    if (isOpenBitbucketIssueAction(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.ShowBitbucketIssue, e.issue);
                    }
                    break;
                }
                case 'openPipelineBuild': {
                    if (isOpenPipelineBuild(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.ShowPipeline, e.pipelineUUID);
                        break;
                    }
                }
                case 'copyPullRequestLink': {
                    handled = true;
                    const linkUrl = this._state.prData.pr!.links!.html!.href!;
                    await vscode.env.clipboard.writeText(linkUrl);
                    vscode.window.showInformationMessage(`Copied pull request link to clipboard - ${linkUrl}`);
                    break;
                }
            }
        }

        return handled;
    }

    private async updatePullRequest(pr: PullRequest) {
        if (this._panel) { this._panel.title = `Pull Request #${pr.data.id}`; }

        if (this.validatePRState(this._state)) {
            this._state.prData.type = 'update';
            this._state.prData.currentBranch = pr.repository.state.HEAD!.name!;
            this.postMessage(this._state.prData);
            return;
        }

        await this.postInitialState(pr);
        await this.postAugmentedState(pr);
    }

    private async postInitialState(pr: PullRequest) {
        const isStagingRepo = pr.remote && RepositoriesApi.isStagingUrl(pr.remote.fetchUrl!);
        const currentUser = await Container.bitbucketContext.currentUser(isStagingRepo);
        this._state = {
            repository: pr.repository,
            remote: pr.remote,
            sourceRemote: pr.sourceRemote || pr.remote,
            prData: {
                type: 'update',
                pr: pr.data,
                currentUser: currentUser,
                currentBranch: pr.repository.state.HEAD!.name!,
                commits: undefined,
                comments: undefined,
                relatedJiraIssues: undefined,
                relatedBitbucketIssues: undefined,
                errors: undefined
            }
        };

        this.postMessage(this._state.prData);
    }

    private async postAugmentedState(pr: PullRequest) {
        let promises = Promise.all([
            PullRequestApi.getCommits(pr),
            PullRequestApi.getComments(pr),
            PullRequestApi.getBuildStatuses(pr)
        ]);
        const [commits, comments, buildStatuses] = await promises;
        const relatedJiraIssues = await this.fetchRelatedJiraIssues(pr, comments);
        const relatedBitbucketIssues = await this.fetchRelatedBitbucketIssues(pr, comments);
        this._state.prData = {
            ...this._state.prData,
            ...{
                type: 'update',
                commits: commits.data,
                comments: comments.data,
                relatedJiraIssues: relatedJiraIssues,
                relatedBitbucketIssues: relatedBitbucketIssues,
                buildStatuses: buildStatuses,
                errors: (commits.next || comments.next) ? 'You may not seeing the complete pull request. This PR contains more items (commits/comments) than what this extension supports.' : undefined
            }
        };

        this.postMessage(this._state.prData);
    }

    private async fetchRelatedJiraIssues(pr: PullRequest, comments: PaginatedComments): Promise<Issue[]> {
        let result: Issue[] = [];
        try {
            const issueKeys = await extractIssueKeys(pr, comments.data);
            result = await Promise.all(issueKeys.map(async (issueKey) => await fetchIssue(issueKey)));
        }
        catch (e) {
            result = [];
            Logger.debug('error fetching related jira issues: ', e);
        }
        return result;
    }

    private async fetchRelatedBitbucketIssues(pr: PullRequest, comments: PaginatedComments): Promise<Bitbucket.Schema.Issue[]> {
        let result: Bitbucket.Schema.Issue[] = [];
        try {
            const issueKeys = await extractBitbucketIssueKeys(pr, comments.data);
            result = await BitbucketIssuesApi.getIssuesForKeys(pr.repository, issueKeys);
        }
        catch (e) {
            result = [];
            Logger.debug('error fetching related bitbucket issues: ', e);
        }
        return result;
    }

    private async approve() {
        await PullRequestApi.approve({ repository: this._state.repository!, remote: this._state.remote!, sourceRemote: this._state.sourceRemote, data: this._state.prData.pr! });
        prApproveEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
        await this.forceUpdatePullRequest();
    }

    private async merge() {
        await PullRequestApi.merge({ repository: this._state.repository!, remote: this._state.remote!, sourceRemote: this._state.sourceRemote, data: this._state.prData.pr! });
        prMergeEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
        vscode.commands.executeCommand(Commands.BitbucketRefreshPullRequests);
        vscode.commands.executeCommand(Commands.RefreshPipelines);
        await this.forceUpdatePullRequest();
    }

    private async checkout(branch: string, isSourceBranch: boolean) {
        if (isSourceBranch && this._state.sourceRemote && this._state.sourceRemote !== this._state.remote) {
            // pull request is from a fork repository
            await this._state.repository!.getConfig(`remote.${this._state.sourceRemote!.name}.url`)
                .then(async url => {
                    if (!url) {
                        await this._state.repository!.addRemote(this._state.sourceRemote!.name, GitUrlParse(this._state.sourceRemote!.fetchUrl!).toString("ssh"));
                    }
                })
                .catch(async _ => {
                    await this._state.repository!.addRemote(this._state.sourceRemote!.name, GitUrlParse(this._state.sourceRemote!.fetchUrl!).toString("ssh"));
                });
        }
        await this._state.repository!.fetch(this._state.sourceRemote!.name, this._state.prData.pr!.source!.branch!.name);
        this._state.repository!.checkout(branch || this._state.prData.pr!.source!.branch!.name!)
            .then(() => {
                this.postMessage({
                    type: 'checkout',
                    currentBranch: this._state.repository!.state.HEAD!.name!
                });
                prCheckoutEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
            })
            .catch((e: any) => {
                Logger.error(new Error(`error checking out the pull request branch: ${e}`));
                this.postMessage({ type: 'error', reason: e });
            });
    }

    private async postComment(text: string, parentId?: number) {
        await PullRequestApi.postComment(this._state.remote!, this._state.prData.pr!.id!, text, parentId);
        await this.forceUpdateComments();
    }

    private async forceUpdatePullRequest() {
        const result = await PullRequestApi.get({ repository: this._state.repository!, remote: this._state.remote!, sourceRemote: this._state.sourceRemote, data: this._state.prData.pr! });
        this._state.prData.pr = result.data;
        this._state.prData.currentBranch = result.repository.state.HEAD!.name!;
        await this.updatePullRequest(result).catch(reason => {
            Logger.debug("update rejected", reason);
        });
    }

    private async forceUpdateComments() {
        const pr = { repository: this._state.repository!, remote: this._state.remote!, sourceRemote: this._state.sourceRemote, data: this._state.prData.pr! };
        const paginatedComments = await PullRequestApi.getComments(pr);
        this._state.prData.comments = paginatedComments.data;
        await this.updatePullRequest(pr);
    }
}
