import * as vscode from 'vscode';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { Action, HostErrorMessage, onlineStatus } from '../ipc/messaging';
import { IssueData } from '../ipc/issueMessaging';
import { Issue, emptyIssue, issueOrKey, isIssue } from '../jira/jiraModel';
import { fetchIssue } from "../jira/fetchIssue";
import { Logger } from '../logger';
import { isTransitionIssue, isIssueComment, isIssueAssign, isOpenJiraIssue, isOpenStartWorkPageAction } from '../ipc/issueActions';
import { transitionIssue } from '../commands/jira/transitionIssue';
import { postComment } from '../commands/jira/postComment';
import { Container } from '../container';
import { isEmptySite } from '../config/model';
import { AuthProvider } from '../atlclients/authInfo';
import { assignIssue } from '../commands/jira/assignIssue';
import { Commands } from '../commands';
import { issuesForJQL } from '../jira/issuesForJql';
import { issueUrlCopiedEvent } from '../analytics';

type Emit = IssueData | HostErrorMessage;
export class JiraIssueWebview extends AbstractReactWebview<Emit, Action> implements InitializingWebview<issueOrKey> {
    private _state: Issue = emptyIssue;
    private _currentUserId?: string;
    private _issueKey: string = "";

    constructor(extensionPath: string) {
        super(extensionPath);
        this.tenantId = Container.jiraSiteManager.effectiveSite.id;
    }

    public get title(): string {
        return "Jira Issue";
    }
    public get id(): string {
        return "viewIssueScreen";
    }

    async initialize(data: issueOrKey) {

        if (isIssue(data)) {
            this._issueKey = data.key;
        } else {
            this._issueKey = data;
        }

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        if (isIssue(data)) {
            this.updateIssue(data);
            return;
        }

        try {
            let issue = await fetchIssue(data);
            this.updateIssue(issue);
        }
        catch (e) {
            Logger.error(e);
            this.postMessage({ type: 'error', reason: e });
        }
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
                    const linkUrl = `https://${this._state.workingSite.name}.atlassian.net/browse/${this._state.key}`;
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
            }
        }

        return handled;
    }

    public async updateIssue(issue: Issue) {
        this._state = issue;
        if (!isEmptySite(issue.workingSite)) {
            this.tenantId = issue.workingSite.id;
        }
        if (!this._currentUserId) {
            const authInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
            this._currentUserId = authInfo ? authInfo.user.id : undefined;
        }

        if (this._panel) { this._panel.title = `Jira Issue ${issue.key}`; }

        const currentBranches = Container.bitbucketContext.getAllRepositores()
            .filter(repo => repo.state.HEAD && repo.state.HEAD.name)
            .map(repo => repo.state.HEAD!.name!);

        let msg = issue as IssueData;
        msg.type = 'update';
        msg.isAssignedToMe = issue.assignee.accountId === this._currentUserId;
        const childIssues = await issuesForJQL(`"Parent link"=${issue.key}`);
        msg.childIssues = childIssues.filter(childIssue => !issue.subtasks.map(subtask => subtask.key).includes(childIssue.key));
        msg.workInProgress = msg.isAssignedToMe &&
            issue.transitions.find(t => t.isInitial && t.to.id === issue.status.id) === undefined &&
            currentBranches.find(b => b.toLowerCase().indexOf(issue.key.toLowerCase()) !== -1) !== undefined;
        this.postMessage(msg);
    }

    private async forceUpdateIssue(issue?: Issue) {
        let key = issue !== undefined ? issue.key : this._issueKey;
        if (key !== "") {
            try {
                let issue = await fetchIssue(key, this._state.workingSite);
                this.updateIssue(issue);
            }
            catch (e) {
                Logger.error(e);
                this.postMessage({ type: 'error', reason: e });
            }
        }
    }
}
