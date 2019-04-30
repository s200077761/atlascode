import * as vscode from 'vscode';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { Action, HostErrorMessage, onlineStatus } from '../ipc/messaging';
import { IssueData } from '../ipc/issueMessaging';
import { Issue, emptyIssue, isIssue } from '../jira/jiraModel';
import { fetchIssue } from "../jira/fetchIssue";
import { Logger } from '../logger';
import { isTransitionIssue, isIssueComment, isIssueAssign, isOpenJiraIssue, isOpenStartWorkPageAction } from '../ipc/issueActions';
import { transitionIssue } from '../commands/jira/transitionIssue';
import { postComment } from '../commands/jira/postComment';
import { Container } from '../container';
import { providerForSite } from '../atlclients/authInfo';
import { assignIssue } from '../commands/jira/assignIssue';
import { Commands } from '../commands';
import { issuesForJQL } from '../jira/issuesForJql';
import { issueUrlCopiedEvent } from '../analytics';
import { isOpenPullRequest } from '../ipc/prActions';
import { PullRequestApi } from '../bitbucket/pullRequests';
import { parseJiraIssueKeys } from '../jira/issueKeyParser';

type Emit = IssueData | HostErrorMessage;
export class JiraIssueWebview extends AbstractReactWebview<Emit, Action> implements InitializingWebview<Issue> {
    private _state: Issue = emptyIssue;
    private _currentUserId?: string;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Jira Issue";
    }
    public get id(): string {
        return "viewIssueScreen";
    }

    async initialize(data: Issue) {
        this._state = data;

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        if (isIssue(data)) {
            this.updateIssue(data);
            return;
        }

        this.invalidate();
    }

    public invalidate() {
        if (Container.onlineDetector.isOnline()) {
            this.forceUpdateIssue();
        }
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if (!handled) {
            switch (e.action) {
                case 'refreshIssue': {
                    handled = true;
                    this.forceUpdateIssue();
                    break;
                }
                case 'transitionIssue': {
                    if (isTransitionIssue(e)) {
                        handled = true;
                        try {
                            await transitionIssue(e.issue, e.transition);
                        }
                        catch (e) {
                            Logger.error(new Error(`error transitioning issue: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'comment': {
                    if (isIssueComment(e)) {
                        handled = true;
                        try {
                            await postComment(e.issue, e.comment);
                            this.forceUpdateIssue();
                        }
                        catch (e) {
                            Logger.error(new Error(`error posting comment: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'assign': {
                    if (isIssueAssign(e)) {
                        handled = true;

                        try {
                            await assignIssue(e.issue, this._currentUserId);
                            this.forceUpdateIssue();
                        }
                        catch (e) {
                            Logger.error(new Error(`error posting comment: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'openJiraIssue': {
                    if (isOpenJiraIssue(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.ShowIssue, e.issueOrKey);
                        break;
                    }
                }
                case 'copyJiraIssueLink': {
                    handled = true;
                    const linkUrl = `https://${this._state.workingSite.name}.${this._state.workingSite.baseUrlSuffix}/browse/${this._state.key}`;
                    await vscode.env.clipboard.writeText(linkUrl);
                    vscode.window.showInformationMessage(`Copied issue link to clipboard - ${linkUrl}`);
                    issueUrlCopiedEvent(Container.jiraSiteManager.effectiveSite.id).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                    break;
                }
                case 'openStartWorkPage': {
                    if (isOpenStartWorkPageAction(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.StartWorkOnIssue, e.issue);
                        break;
                    }
                }
                case 'openPullRequest': {
                    if (isOpenPullRequest(e)) {
                        handled = true;
                        const pr = (await Container.bitbucketContext.recentPullrequestsForAllRepos()).find(p => p.data.links!.self!.href === e.prHref);
                        if (pr) {
                            vscode.commands.executeCommand(Commands.BitbucketShowPullRequestDetails, await PullRequestApi.get(pr));
                        } else {
                            Logger.error(new Error(`error opening pullrequest: ${e.prHref}`));
                            this.postMessage({ type: 'error', reason: `error opening pullrequest: ${e.prHref}` });
                        }
                        break;
                    }
                }
            }
        }

        return handled;
    }

    public async updateIssue(issue: Issue) {
        this._state = issue;
        if (!this._currentUserId) {
            const authInfo = await Container.authManager.getAuthInfo(providerForSite(issue.workingSite));
            this._currentUserId = authInfo ? authInfo.user.id : undefined;
        }

        if (this._panel) { this._panel.title = `Jira Issue ${issue.key}`; }

        const currentBranches = Container.bitbucketContext ?
            Container.bitbucketContext.getAllRepositores()
                .filter(repo => repo.state.HEAD && repo.state.HEAD.name)
                .map(repo => repo.state.HEAD!.name!)
            : [];

        let msg = issue as IssueData;
        msg.type = 'update';
        msg.isAssignedToMe = issue.assignee.accountId === this._currentUserId;
        const childIssues = await issuesForJQL(`linkedIssue = ${issue.key} AND issuekey != ${issue.key} AND "Epic Link" != ${issue.key}`);
        msg.childIssues = childIssues.filter(childIssue => !issue.subtasks.map(subtask => subtask.key).includes(childIssue.key));

        if (issue.isEpic && issue.epicChildren.length < 1) {
            msg.epicChildren = await issuesForJQL(`"Epic Link" = "${msg.key}" order by lastViewed DESC`);
        }

        msg.workInProgress = msg.isAssignedToMe &&
            issue.transitions.find(t => t.isInitial && t.to.id === issue.status.id) === undefined &&
            currentBranches.find(b => b.toLowerCase().indexOf(issue.key.toLowerCase()) !== -1) !== undefined;

        msg.recentPullRequests = [];
        this.postMessage(msg);

        const relatedPrs = await this.recentPullRequests();
        if (relatedPrs.length > 0) {
            msg.recentPullRequests = await this.recentPullRequests();
            this.postMessage(msg);
        }
    }

    private async forceUpdateIssue() {
        if (this._state.key !== "") {
            try {
                let issue = await fetchIssue(this._state.key, this._state.workingSite);
                await this.updateIssue(issue);
            }
            catch (e) {
                Logger.error(e);
                this.postMessage({ type: 'error', reason: e });
            }
        }
    }

    private async recentPullRequests(): Promise<Bitbucket.Schema.Pullrequest[]> {
        if (!Container.bitbucketContext) {
            return [];
        }

        const prs = await Container.bitbucketContext.recentPullrequestsForAllRepos();
        const relatedPrs = await Promise.all(prs.map(async pr => {
            const issueKeys = [...await parseJiraIssueKeys(pr.data.title!), ...await parseJiraIssueKeys(pr.data.summary!.raw!)];
            return issueKeys.find(key => key.toLowerCase() === this._state.key.toLowerCase()) !== undefined
                ? pr
                : undefined;
        }));

        return relatedPrs.filter(pr => pr !== undefined).map(p => p!.data);
    }
}
