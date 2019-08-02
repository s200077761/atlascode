import * as vscode from 'vscode';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { Action, HostErrorMessage, onlineStatus } from '../ipc/messaging';
import { IssueData, UserList, LabelList, JqlOptionsList, CreatedSomething } from '../ipc/issueMessaging';
import { Logger } from '../logger';
import { isTransitionIssue, isIssueComment, isIssueAssign, isOpenJiraIssue, isOpenStartWorkPageAction, isFetchQuery, isCreateSomething } from '../ipc/issueActions';
import { transitionIssue } from '../commands/jira/transitionIssue';
import { postComment } from '../commands/jira/postComment';
import { Container } from '../container';
import { assignIssue, unassignIssue } from '../commands/jira/assignIssue';
import { Commands } from '../commands';
import { issuesForJQL } from '../jira/issuesForJql';
import { issueUrlCopiedEvent } from '../analytics';
import { isOpenPullRequest } from '../ipc/prActions';
import { parseJiraIssueKeys } from '../jira/issueKeyParser';
import { PullRequestData } from '../bitbucket/model';
import { PullRequestProvider } from '../bitbucket/prProvider';
import { AutoCompleteSuggestion } from '../jira/jira-client/client';
import { DetailedIssue, emptyIssue } from '../jira/jira-client/model/detailedJiraIssue';

type Emit = IssueData | UserList | LabelList | JqlOptionsList | CreatedSomething | HostErrorMessage;
export class JiraIssueWebview extends AbstractReactWebview<Emit, Action> implements InitializingWebview<string> {
    private _state: DetailedIssue = emptyIssue;
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

    async initialize(issueKey: string) {

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        this.invalidate();
        Container.pmfStats.touchActivity();
    }

    public invalidate() {
        if (Container.onlineDetector.isOnline()) {
            this.forceUpdateIssue();
        }
    }

    protected async onMessageReceived(msg: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(msg);

        if (!handled) {
            switch (msg.action) {
                case 'refreshIssue': {
                    handled = true;
                    this.forceUpdateIssue();
                    break;
                }
                case 'transitionIssue': {
                    if (isTransitionIssue(msg)) {
                        handled = true;
                        try {
                            await transitionIssue(msg.issue, msg.transition);
                        }
                        catch (e) {
                            Logger.error(new Error(`error transitioning issue: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'comment': {
                    if (isIssueComment(msg)) {
                        handled = true;
                        try {
                            await postComment(msg.issue, msg.comment);
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
                    if (isIssueAssign(msg)) {
                        handled = true;

                        try {
                            if (msg.userId) {
                                await assignIssue(msg.issue, msg.userId);
                            } else {
                                await unassignIssue(msg.issue);
                            }
                            this.forceUpdateIssue();
                        }
                        catch (e) {
                            Logger.error(new Error(`error posting comment: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'editIssue': {
                    handled = true;

                    try {
                        const client = await Container.clientManager.jirarequest(this._state.siteDetails);
                        await client.editIssue(this._state.key, (msg as any).fields);
                        this.forceUpdateIssue();
                    }
                    catch (e) {
                        Logger.error(new Error(`error posting comment: ${e}`));
                        this.postMessage({ type: 'error', reason: e });
                    }
                    break;
                }
                case 'fetchUsers': {
                    if (isFetchQuery(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jirarequest(this._state.siteDetails);
                            const users = await client.findUsersAssignableToIssue(this._state.key, msg.query);
                            this.postMessage({ type: 'userList', users: users });
                        }
                        catch (e) {
                            Logger.error(new Error(`error fetching users: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'fetchLabels': {
                    if (isFetchQuery(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jirarequest(this._state.siteDetails);
                            let res: AutoCompleteSuggestion[] = await client.getFieldAutoCompleteSuggestions('labels', msg.query);

                            const options: any[] = res.map((suggestion: any) => suggestion.value);
                            this.postMessage({ type: 'labelList', labels: options });
                        }
                        catch (e) {
                            Logger.error(new Error(`error fetching labels: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'fetchComponents': {
                    if (isFetchQuery(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jirarequest(this._state.siteDetails);
                            let res = await client.getEditIssueMetadata(this._state.key);

                            let options: any[] = [];
                            if (res.fields && res.fields['components'] && res.fields['components'].allowedValues) {
                                options = res.fields['components'].allowedValues;
                            }
                            this.postMessage({ type: 'componentList', fieldId: 'components', options: options });
                        }
                        catch (e) {
                            Logger.error(new Error(`error fetching components: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'fetchFixVersions': {
                    if (isFetchQuery(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jirarequest(this._state.siteDetails);
                            let res = await client.getEditIssueMetadata(this._state.key);

                            let options: any[] = [];
                            if (res.fields && res.fields['fixVersions'] && res.fields['fixVersions'].allowedValues) {
                                options = res.fields['fixVersions'].allowedValues;
                            }
                            this.postMessage({ type: 'fixVersionList', fieldId: 'fixVersions', options: options });
                        }
                        catch (e) {
                            Logger.error(new Error(`error fetching fixVersions: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'createOption': {
                    handled = true;
                    if (isCreateSomething(msg)) {
                        try {

                            const client = await Container.clientManager.jirarequest(this._state.siteDetails);
                            switch (msg.createData.fieldKey) {
                                case 'fixVersions':
                                case 'versions': {
                                    let resp = await client.createVersion({ body: { name: msg.createData.name, project: this._state.key.split('-')[0] } });
                                    this.postMessage({ type: 'optionCreated', createdData: resp });

                                    break;
                                }
                                case 'components': {
                                    let resp = await client.createComponent({ body: { name: msg.createData.name, project: this._state.key.split('-')[0] } });
                                    this.postMessage({ type: 'optionCreated', createdData: resp });

                                    break;
                                }
                            }
                        } catch (e) {
                            Logger.error(new Error(`error creating option: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'openJiraIssue': {
                    if (isOpenJiraIssue(msg)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.ShowIssue, msg.issueKey);
                        break;
                    }
                }
                case 'copyJiraIssueLink': {
                    handled = true;
                    const linkUrl = `https://${this._state.siteDetails.baseLinkUrl}/browse/${this._state.key}`;
                    await vscode.env.clipboard.writeText(linkUrl);
                    vscode.window.showInformationMessage(`Copied issue link to clipboard - ${linkUrl}`);
                    issueUrlCopiedEvent(this._state.siteDetails.id).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                    break;
                }
                case 'openStartWorkPage': {
                    if (isOpenStartWorkPageAction(msg)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.StartWorkOnIssue, msg.issue);
                        break;
                    }
                }
                case 'openPullRequest': {
                    if (isOpenPullRequest(msg)) {
                        handled = true;
                        const pr = (await Container.bitbucketContext.recentPullrequestsForAllRepos()).find(p => p.data.url === msg.prHref);
                        if (pr) {
                            vscode.commands.executeCommand(Commands.BitbucketShowPullRequestDetails, await PullRequestProvider.forRepository(pr.repository).get(pr));
                        } else {
                            Logger.error(new Error(`error opening pullrequest: ${msg.prHref}`));
                            this.postMessage({ type: 'error', reason: `error opening pullrequest: ${msg.prHref}` });
                        }
                        break;
                    }
                }
            }
        }

        return handled;
    }

    public async updateIssue(issue: DetailedIssue) {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {
            this._state = issue;
            if (!this._currentUserId) {
                const authInfo = await Container.authManager.getAuthInfo(this._state.siteDetails);
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
            msg.currentUserId = this._currentUserId!;

            const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(issue.siteDetails);

            const childIssues = await issuesForJQL(`linkedIssue = ${issue.key} AND issuekey != ${issue.key} AND cf[${epicFieldInfo.epicLink.cfid}] != ${issue.key}`);
            msg.childIssues = childIssues.filter(childIssue => !issue.subtasks.map(subtask => subtask.key).includes(childIssue.key));

            if (issue.isEpic && issue.epicChildren.length < 1) {
                msg.epicChildren = await issuesForJQL(`cf[${epicFieldInfo.epicLink.cfid}] = "${msg.key}" order by lastViewed DESC`);
            }

            msg.workInProgress = issue.assignee.accountId === this._currentUserId &&
                issue.transitions.find(t => t.isInitial && t.to.id === issue.status.id) === undefined &&
                currentBranches.find(b => b.toLowerCase().indexOf(issue.key.toLowerCase()) !== -1) !== undefined;

            msg.recentPullRequests = [];
            this.postMessage(msg);

            const relatedPrs = await this.recentPullRequests();
            if (relatedPrs.length > 0) {
                msg.recentPullRequests = await this.recentPullRequests();
                this.postMessage(msg);
            }
        } catch (e) {
            let err = new Error(`error updating issue: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: `error updating issue: ${e}` });
        } finally {
            this.isRefeshing = false;
        }
    }

    private async forceUpdateIssue() {
        if (this._state.key !== "") {
            try {
                // let issue = await fetchDetailedIssue(this._state.key, this._state.siteDetails);
                // await this.updateIssue(issue);
            }
            catch (e) {
                Logger.error(e);
                this.postMessage({ type: 'error', reason: e });
            }
        }
    }

    private async recentPullRequests(): Promise<PullRequestData[]> {
        if (!Container.bitbucketContext) {
            return [];
        }

        const prs = await Container.bitbucketContext.recentPullrequestsForAllRepos();
        const relatedPrs = await Promise.all(prs.map(async pr => {
            const issueKeys = [...await parseJiraIssueKeys(pr.data.title!), ...await parseJiraIssueKeys(pr.data.rawSummary!)];
            return issueKeys.find(key => key.toLowerCase() === this._state.key.toLowerCase()) !== undefined
                ? pr
                : undefined;
        }));

        return relatedPrs.filter(pr => pr !== undefined).map(p => p!.data);
    }
}
