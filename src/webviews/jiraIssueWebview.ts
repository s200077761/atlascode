import { AbstractIssueEditorWebview, CommonEditorWebviewEmit } from "./abstractIssueEditorWebview";
import { InitializingWebview } from "./abstractWebview";
import { MinimalIssue } from "../jira/jira-client/model/entities";
import { Action, onlineStatus } from "../ipc/messaging";
import { EditIssueUI } from "../jira/jira-client/model/editIssueUI";
import { Container } from "../container";
import { fetchEditIssueUI } from "../jira/fetchIssue";
import { Logger } from "../logger";
import { EditIssueData, FieldValueUpdate, emptyEditIssueData } from "../ipc/issueMessaging";
import { EditIssueAction, isIssueComment } from "../ipc/issueActions";
import { emptyMinimalIssue } from "../jira/jira-client/model/emptyEntities";
import { FieldValues } from "../jira/jira-client/model/fieldUI";
import { postComment } from "../commands/jira/postComment";

type Emit = CommonEditorWebviewEmit | EditIssueUI | FieldValueUpdate;
export class JiraIssueWebview extends AbstractIssueEditorWebview<Emit, Action> implements InitializingWebview<MinimalIssue> {
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
                const authInfo = await Container.authManager.getAuthInfo(this._issue.siteDetails);
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
            }
        }

        return handled;
    }
}
