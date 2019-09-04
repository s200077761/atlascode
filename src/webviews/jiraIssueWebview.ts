import { AbstractIssueEditorWebview } from "./abstractIssueEditorWebview";
import { InitializingWebview } from "./abstractWebview";
import { MinimalIssue, IssueLinkIssueKeys, readIssueLinkIssue, User } from "../jira/jira-client/model/entities";
import { Action, onlineStatus } from "../ipc/messaging";
import { EditIssueUI } from "../jira/jira-client/model/editIssueUI";
import { Container } from "../container";
import { fetchEditIssueUI, getCachedOrFetchMinimalIssue } from "../jira/fetchIssue";
import { Logger } from "../logger";
import { EditIssueData, emptyEditIssueData } from "../ipc/issueMessaging";
import { EditIssueAction, isIssueComment, isCreateIssue, isCreateIssueLink, isTransitionIssue, isCreateWorklog, isUpdateWatcherAction, isUpdateVoteAction, isAddAttachmentsAction } from "../ipc/issueActions";
import { emptyMinimalIssue, emptyUser, isEmptyUser } from "../jira/jira-client/model/emptyEntities";
import { FieldValues, ValueType } from "../jira/jira-client/model/fieldUI";
import { postComment } from "../commands/jira/postComment";
import { commands } from "vscode";
import { Commands } from "../commands";
import { issueCreatedEvent } from "../analytics";
import { transitionIssue } from "../jira/transitionIssue";
import { parseJiraIssueKeys } from "../jira/issueKeyParser";
import { PullRequestData } from "../bitbucket/model";

export class JiraIssueWebview extends AbstractIssueEditorWebview implements InitializingWebview<MinimalIssue> {
    private _issue: MinimalIssue;
    private _editUIData: EditIssueData;
    private _currentUser: User;

    constructor(extensionPath: string) {
        super(extensionPath);
        this._issue = emptyMinimalIssue;
        this._editUIData = emptyEditIssueData;
        this._currentUser = emptyUser;
    }

    public get title(): string {
        return "Jira Issue";
    }
    public get id(): string {
        return "viewIssueScreen";
    }

    async initialize(issue: MinimalIssue) {
        this._issue = issue;

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }
        this.invalidate();
    }

    invalidate(): void {
        if (Container.onlineDetector.isOnline()) {
            this.forceUpdateIssue();
        }

        Container.pmfStats.touchActivity();
    }

    private getFieldValuesForKeys(keys: string[]): FieldValues {
        const values: FieldValues = {};
        const editKeys: string[] = Object.keys(this._editUIData.fieldValues);

        keys.map((key, idx) => {
            if (editKeys.includes(key)) {
                values[key] = this._editUIData.fieldValues[key];
            }
        });

        return values;
    }

    private async forceUpdateIssue() {
        if (this.isRefeshing) {
            return;
        }
        console.log('force updating issue');
        this.isRefeshing = true;
        try {
            const editUI: EditIssueUI = await fetchEditIssueUI(this._issue);

            if (this._panel) { this._panel.title = `Jira Issue ${this._issue.key}`; }

            // const currentBranches = Container.bitbucketContext ?
            //     Container.bitbucketContext.getAllRepositores()
            //         .filter(repo => repo.state.HEAD && repo.state.HEAD.name)
            //         .map(repo => repo.state.HEAD!.name!)
            //     : [];

            this._editUIData = editUI as EditIssueData;

            // msg.workInProgress = this._issue.assignee.accountId === this._currentUserId &&
            //     issue.transitions.find(t => t.isInitial && t.to.id === issue.status.id) === undefined &&
            //     currentBranches.find(b => b.toLowerCase().indexOf(issue.key.toLowerCase()) !== -1) !== undefined;

            this._editUIData.recentPullRequests = [];
            this._editUIData.currentUser = emptyUser;

            let msg = this._editUIData;

            msg.type = 'update';

            this.postMessage(msg);

            // call async-able update functions here
            this.updateCurrentUser();
            this.updateWatchers();
            this.updateVoters();
            this.updateRelatedPullRequests();

        } catch (e) {
            let err = new Error(`error updating issue: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: `error updating issue: ${e}` });
        } finally {
            this.isRefeshing = false;
        }
    }

    async updateCurrentUser() {
        if (isEmptyUser(this._currentUser)) {
            const client = await Container.clientManager.jirarequest(this._issue.siteDetails);
            const user = await client.getCurrentUser();
            this._currentUser = user;
            this.postMessage({ type: 'currentUserUpdate', currentUser: user });
        }

    }

    async updateRelatedPullRequests() {
        const relatedPrs = await this.recentPullRequests();
        if (relatedPrs.length > 0) {
            this.postMessage({ type: 'pullRequestUpdate', recentPullRequests: relatedPrs });
        }
    }

    async updateWatchers() {
        if (this._editUIData.fieldValues['watches'] && this._editUIData.fieldValues['watches'].watchCount > 0) {
            const client = await Container.clientManager.jirarequest(this._issue.siteDetails);
            const watches = await client.getWatchers(this._issue.key);

            this._editUIData.fieldValues['watches'] = watches;
            this.postMessage({
                type: 'fieldValueUpdate'
                , fieldValues: { 'watches': this._editUIData.fieldValues['watches'] }
            });
        }
    }

    async updateVoters() {
        if (this._editUIData.fieldValues['votes'] && this._editUIData.fieldValues['votes'].votes > 0) {
            const client = await Container.clientManager.jirarequest(this._issue.siteDetails);
            const votes = await client.getVotes(this._issue.key);

            this._editUIData.fieldValues['votes'] = votes;
            this.postMessage({
                type: 'fieldValueUpdate'
                , fieldValues: { 'votes': this._editUIData.fieldValues['votes'] }
            });
        }
    }

    async handleSelectOptionCreated(fieldKey: string, newValue: any): Promise<void> {
        if (!Array.isArray(this._editUIData.fieldValues[fieldKey])) {
            this._editUIData.fieldValues[fieldKey] = [];
        }

        if (!Array.isArray(this._editUIData.selectFieldOptions[fieldKey])) {
            this._editUIData.selectFieldOptions[fieldKey] = [];
        }

        if (this._editUIData.fields[fieldKey].valueType === ValueType.Version) {
            if (this._editUIData.selectFieldOptions[fieldKey][0].options) {
                this._editUIData.selectFieldOptions[fieldKey][0].options.push(newValue);
            }
        } else {
            this._editUIData.selectFieldOptions[fieldKey].push(newValue);
            this._editUIData.selectFieldOptions[fieldKey] = this._editUIData.selectFieldOptions[fieldKey].sort();
        }

        this._editUIData.fieldValues[fieldKey].push(newValue);

        const client = await Container.clientManager.jirarequest(this._issue.siteDetails);
        await client.editIssue(this._issue!.key, { [fieldKey]: this._editUIData.fieldValues[fieldKey] });

        let optionMessage = {
            type: 'optionCreated',
            fieldValues: { [fieldKey]: this._editUIData.fieldValues[fieldKey] },
            selectFieldOptions: { [fieldKey]: this._editUIData.selectFieldOptions[fieldKey] },
            fieldKey: fieldKey
        };

        this.postMessage(optionMessage);
    }

    protected async onMessageReceived(msg: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(msg);

        if (!handled) {
            switch (msg.action) {
                case 'editIssue': {
                    handled = true;
                    const newFieldValues: FieldValues = (msg as EditIssueAction).fields;
                    try {
                        const client = await Container.clientManager.jirarequest(this._issue.siteDetails);
                        await client.editIssue(this._issue!.key, newFieldValues);
                        this._editUIData.fieldValues = { ...this._editUIData.fieldValues, ...newFieldValues };
                        this.postMessage({ type: 'fieldValueUpdate', fieldValues: newFieldValues });

                        // TODO: [VSCODE-601] add a new analytic event for issue updates
                        commands.executeCommand(Commands.RefreshJiraExplorer);
                    }
                    catch (e) {
                        Logger.error(new Error(`error updating issue: ${e}`));
                        this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error updating issue'), fieldValues: this.getFieldValuesForKeys(Object.keys(newFieldValues)) });
                    }
                    break;
                }
                case 'comment': {
                    if (isIssueComment(msg)) {
                        handled = true;
                        try {
                            const res = await postComment(msg.issue, msg.comment);
                            this._editUIData.fieldValues['comment'].comments.push(res);

                            this.postMessage({
                                type: 'fieldValueUpdate'
                                , fieldValues: { 'comment': this._editUIData.fieldValues['comment'] }
                            });

                        }
                        catch (e) {
                            Logger.error(new Error(`error posting comment: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error adding comment') });
                        }
                    }
                    break;
                }
                case 'createIssue': {
                    if (isCreateIssue(msg)) {
                        handled = true;
                        try {
                            let client = await Container.clientManager.jirarequest(msg.site);
                            const resp = await client.createIssue(msg.issueData);

                            const createdIssue = await client.getIssue(resp.key, IssueLinkIssueKeys, '');
                            const picked = readIssueLinkIssue(createdIssue, msg.site);

                            this._editUIData.fieldValues['subtasks'].push(picked);
                            this.postMessage({
                                type: 'fieldValueUpdate'
                                , fieldValues: { 'subtasks': this._editUIData.fieldValues['subtasks'] }
                            });
                            issueCreatedEvent(resp.key, msg.site.id).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                            commands.executeCommand(Commands.RefreshJiraExplorer);

                        } catch (e) {
                            Logger.error(new Error(`error creating issue: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error creating issue') });
                        }

                    }
                    break;
                }
                case 'createIssueLink': {
                    if (isCreateIssueLink(msg)) {
                        handled = true;
                        try {
                            let client = await Container.clientManager.jirarequest(msg.site);
                            await client.createIssueLink(msg.issueLinkData);

                            const linkedIssueKey: string = (msg.issueLinkType.type === 'inward') ? msg.issueLinkData.inwardIssue.key : msg.issueLinkData.outwardIssue.key;

                            const issue = await getCachedOrFetchMinimalIssue(linkedIssueKey, msg.site);
                            const picked = readIssueLinkIssue(issue, msg.site);

                            this._editUIData.fieldValues['issuelinks'].push({
                                id: "",
                                inwardIssue: msg.issueLinkType.type === 'inward' ? picked : undefined,
                                outwardIssue: msg.issueLinkType.type === 'outward' ? picked : undefined,
                                type: msg.issueLinkType
                            });
                            this.postMessage({
                                type: 'fieldValueUpdate'
                                , fieldValues: { 'issuelinks': this._editUIData.fieldValues['issuelinks'] }
                            });

                            // TODO: [VSCODE-601] add a new analytic event for issue updates
                            commands.executeCommand(Commands.RefreshJiraExplorer);

                        } catch (e) {
                            Logger.error(new Error(`error creating issue link: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error creating issue issue link') });
                        }

                    }
                    break;
                }
                case 'createWorklog': {
                    if (isCreateWorklog(msg)) {
                        handled = true;
                        try {
                            let client = await Container.clientManager.jirarequest(msg.site);
                            const resp = await client.addWorklog(msg.issueKey, msg.worklogData);

                            if (!this._editUIData.fieldValues['worklog']
                                || !this._editUIData.fieldValues['worklog'].worklogs
                                || !Array.isArray(this._editUIData.fieldValues['worklog'].worklogs)
                            ) {
                                this._editUIData.fieldValues['worklog'].worklogs = [];
                            }

                            this._editUIData.fieldValues['worklog'].worklogs.push(resp);
                            this.postMessage({
                                type: 'fieldValueUpdate'
                                , fieldValues: { 'worklog': this._editUIData.fieldValues['worklog'] }
                            });

                            // TODO: [VSCODE-601] add a new analytic event for issue updates

                        } catch (e) {
                            Logger.error(new Error(`error creating worklog: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error creating worklog') });
                        }

                    }
                    break;
                }
                case 'addWatcher': {
                    if (isUpdateWatcherAction(msg)) {
                        handled = true;
                        try {
                            let client = await Container.clientManager.jirarequest(msg.site);
                            await client.addWatcher(msg.issueKey, msg.watcher.accountId);

                            if (!this._editUIData.fieldValues['watches']
                                || !this._editUIData.fieldValues['watches'].watchers
                                || !Array.isArray(this._editUIData.fieldValues['watches'].watchers)
                            ) {
                                this._editUIData.fieldValues['watches'].watchers = [];
                            }

                            this._editUIData.fieldValues['watches'].watchers.push(msg.watcher);
                            this._editUIData.fieldValues['watches'].watchCount = this._editUIData.fieldValues['watches'].watchers.length;
                            if (msg.watcher.accountId === this._currentUser.accountId) {
                                this._editUIData.fieldValues['watches'].isWatching = true;
                            }

                            this.postMessage({
                                type: 'fieldValueUpdate'
                                , fieldValues: { 'watches': this._editUIData.fieldValues['watches'] }
                            });

                            // TODO: [VSCODE-601] add a new analytic event for issue updates

                        } catch (e) {
                            Logger.error(new Error(`error adding watcher: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error adding watcher') });
                        }

                    }
                    break;
                }
                case 'removeWatcher': {
                    if (isUpdateWatcherAction(msg)) {
                        handled = true;
                        try {
                            let client = await Container.clientManager.jirarequest(msg.site);
                            await client.removeWatcher(msg.issueKey, msg.watcher.accountId);
                            if (!this._editUIData.fieldValues['watches']
                                || !this._editUIData.fieldValues['watches'].watchers
                                || !Array.isArray(this._editUIData.fieldValues['watches'].watchers)
                            ) {
                                this._editUIData.fieldValues['watches'].watchers = [];
                            }
                            const foundIndex: number = this._editUIData.fieldValues['watches'].watchers.findIndex((user: User) => user.accountId === msg.watcher.accountId);
                            if (foundIndex > -1) {
                                this._editUIData.fieldValues['watches'].watchers.splice(foundIndex, 1);
                            }

                            if (msg.watcher.accountId === this._currentUser.accountId) {
                                this._editUIData.fieldValues['watches'].isWatching = false;
                            }

                            this._editUIData.fieldValues['watches'].watchCount = this._editUIData.fieldValues['watches'].watchers.length;


                            this.postMessage({
                                type: 'fieldValueUpdate'
                                , fieldValues: { 'watches': this._editUIData.fieldValues['watches'] }
                            });

                            // TODO: [VSCODE-601] add a new analytic event for issue updates

                        } catch (e) {
                            Logger.error(new Error(`error removing watcher: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error removing watcher') });
                        }

                    }
                    break;
                }
                case 'addVote': {
                    if (isUpdateVoteAction(msg)) {
                        handled = true;
                        try {
                            let client = await Container.clientManager.jirarequest(msg.site);
                            await client.addVote(msg.issueKey);

                            if (!this._editUIData.fieldValues['votes']
                                || !this._editUIData.fieldValues['votes'].voters
                                || !Array.isArray(this._editUIData.fieldValues['votes'].voters)
                            ) {
                                this._editUIData.fieldValues['votes'].voters = [];
                            }

                            this._editUIData.fieldValues['votes'].voters.push(msg.voter);
                            this._editUIData.fieldValues['votes'].votes = this._editUIData.fieldValues['votes'].voters.length;
                            this._editUIData.fieldValues['votes'].hasVoted = true;

                            this.postMessage({
                                type: 'fieldValueUpdate'
                                , fieldValues: { 'votes': this._editUIData.fieldValues['votes'] }
                            });

                            // TODO: [VSCODE-601] add a new analytic event for issue updates

                        } catch (e) {
                            Logger.error(new Error(`error adding vote: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error adding vote') });
                        }

                    }
                    break;
                }
                case 'removeVote': {
                    if (isUpdateVoteAction(msg)) {
                        handled = true;
                        try {
                            let client = await Container.clientManager.jirarequest(msg.site);
                            await client.removeVote(msg.issueKey);
                            if (!this._editUIData.fieldValues['votes']
                                || !this._editUIData.fieldValues['votes'].voters
                                || !Array.isArray(this._editUIData.fieldValues['votes'].voters)
                            ) {
                                this._editUIData.fieldValues['votes'].voters = [];
                            }
                            const foundIndex: number = this._editUIData.fieldValues['votes'].voters.findIndex((user: User) => user.accountId === msg.voter.accountId);
                            if (foundIndex > -1) {
                                this._editUIData.fieldValues['votes'].voters.splice(foundIndex, 1);
                            }

                            this._editUIData.fieldValues['votes'].hasVoted = false;
                            this._editUIData.fieldValues['votes'].votes = this._editUIData.fieldValues['votes'].voters.length;


                            this.postMessage({
                                type: 'fieldValueUpdate'
                                , fieldValues: { 'votes': this._editUIData.fieldValues['votes'] }
                            });

                            // TODO: [VSCODE-601] add a new analytic event for issue updates

                        } catch (e) {
                            Logger.error(new Error(`error removing vote: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error removing vote') });
                        }

                    }
                    break;
                }
                case 'addAttachments': {
                    if (isAddAttachmentsAction(msg)) {
                        handled = true;
                        try {
                            let client = await Container.clientManager.jirarequest(msg.site);
                            const resp = await client.addAttachments(msg.issueKey, msg.files);

                            if (!this._editUIData.fieldValues['attachment']
                                || !Array.isArray(this._editUIData.fieldValues['attachment'])
                            ) {
                                this._editUIData.fieldValues['attachment'] = [];
                            }

                            this._editUIData.fieldValues['attachment'].push(resp);

                            this.postMessage({
                                type: 'fieldValueUpdate'
                                , fieldValues: { 'attachment': this._editUIData.fieldValues['attachment'] }
                            });

                            // TODO: [VSCODE-601] add a new analytic event for issue updates

                        } catch (e) {
                            Logger.error(new Error(`error adding attachments: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error adding attachments') });
                        }

                    }
                    break;
                }
                case 'transitionIssue': {
                    if (isTransitionIssue(msg)) {
                        handled = true;
                        try {
                            await transitionIssue(msg.issue, msg.transition);

                            this._editUIData.fieldValues['status'] = msg.transition.to;
                            this.postMessage({
                                type: 'fieldValueUpdate'
                                , fieldValues: { 'status': this._editUIData.fieldValues['status'] }
                            });

                            commands.executeCommand(Commands.RefreshJiraExplorer);

                        } catch (e) {
                            Logger.error(new Error(`error transitioning issue: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error transitioning issue') });
                        }

                    }
                    break;
                }
            }
        }

        return handled;
    }

    private async recentPullRequests(): Promise<PullRequestData[]> {
        if (!Container.bitbucketContext) {
            return [];
        }

        const prs = await Container.bitbucketContext.recentPullrequestsForAllRepos();
        const relatedPrs = await Promise.all(prs.map(async pr => {
            const issueKeys = [...await parseJiraIssueKeys(pr.data.title!), ...await parseJiraIssueKeys(pr.data.rawSummary!)];
            return issueKeys.find(key => key.toLowerCase() === this._issue.key.toLowerCase()) !== undefined
                ? pr
                : undefined;
        }));

        return relatedPrs.filter(pr => pr !== undefined).map(p => p!.data);
    }
}
