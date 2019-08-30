import { AbstractIssueEditorWebview } from "./abstractIssueEditorWebview";
import { InitializingWebview } from "./abstractWebview";
import { MinimalIssue, IssueLinkIssueKeys, readIssueLinkIssue } from "../jira/jira-client/model/entities";
import { Action, onlineStatus } from "../ipc/messaging";
import { EditIssueUI } from "../jira/jira-client/model/editIssueUI";
import { Container } from "../container";
import { fetchEditIssueUI, getCachedOrFetchMinimalIssue } from "../jira/fetchIssue";
import { Logger } from "../logger";
import { EditIssueData, emptyEditIssueData } from "../ipc/issueMessaging";
import { EditIssueAction, isIssueComment, isCreateIssue, isCreateIssueLink, isTransitionIssue } from "../ipc/issueActions";
import { emptyMinimalIssue } from "../jira/jira-client/model/emptyEntities";
import { FieldValues, ValueType } from "../jira/jira-client/model/fieldUI";
import { postComment } from "../commands/jira/postComment";
import { commands } from "vscode";
import { Commands } from "../commands";
import { issueCreatedEvent } from "../analytics";
import { transitionIssue } from "../jira/transitionIssue";

export class JiraIssueWebview extends AbstractIssueEditorWebview implements InitializingWebview<MinimalIssue> {
    private _issue: MinimalIssue;
    private _editUIData: EditIssueData;
    private _currentUserId: string | undefined;

    constructor(extensionPath: string) {
        super(extensionPath);
        this._issue = emptyMinimalIssue;
        this._editUIData = emptyEditIssueData;
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
            if (!this._currentUserId) {
                const authInfo = await Container.credentialManager.getAuthInfo(this._issue.siteDetails);
                this._currentUserId = authInfo ? authInfo.user.id : undefined;
            }

            if (this._panel) { this._panel.title = `Jira Issue ${this._issue.key}`; }

            // const currentBranches = Container.bitbucketContext ?
            //     Container.bitbucketContext.getAllRepositores()
            //         .filter(repo => repo.state.HEAD && repo.state.HEAD.name)
            //         .map(repo => repo.state.HEAD!.name!)
            //     : [];

            this._editUIData = editUI as EditIssueData;
            this._editUIData.currentUserId = this._currentUserId!;

            // msg.workInProgress = this._issue.assignee.accountId === this._currentUserId &&
            //     issue.transitions.find(t => t.isInitial && t.to.id === issue.status.id) === undefined &&
            //     currentBranches.find(b => b.toLowerCase().indexOf(issue.key.toLowerCase()) !== -1) !== undefined;

            this._editUIData.recentPullRequests = [];

            let msg = this._editUIData;

            msg.type = 'update';
            // TODO: 
            this.postMessage(msg);

            //const relatedPrs = await this.recentPullRequests();
            // if (relatedPrs.length > 0) {
            //     msg.recentPullRequests = await this.recentPullRequests();
            //     this.postMessage(msg);
            // }
        } catch (e) {
            let err = new Error(`error updating issue: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: `error updating issue: ${e}` });
        } finally {
            this.isRefeshing = false;
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

        const client = await Container.clientManager.jiraClient(this._issue.siteDetails);
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
                        const client = await Container.clientManager.jiraClient(this._issue.siteDetails);
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
                            let client = await Container.clientManager.jiraClient(msg.site);
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
                            let client = await Container.clientManager.jiraClient(msg.site);
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
}
