import { AbstractIssueEditorWebview, CommonEditorWebviewEmit } from "./abstractIssueEditorWebview";
import { InitializingWebview } from "./abstractWebview";
import { MinimalIssue } from "../jira/jira-client/model/entities";
import { Action, onlineStatus } from "../ipc/messaging";
import { EditIssueUI } from "../jira/jira-client/model/editIssueUI";
import { Container } from "../container";
import { fetchEditIssueUI } from "../jira/fetchIssue";
import { Logger } from "../logger";
import { EditIssueData } from "../ipc/issueMessaging";

type Emit = CommonEditorWebviewEmit | EditIssueUI;
export class JiraIssueWebview extends AbstractIssueEditorWebview<Emit, Action> implements InitializingWebview<MinimalIssue> {
    private _issue: MinimalIssue | undefined;
    private _currentUserId: string | undefined;

    constructor(extensionPath: string) {
        super(extensionPath);
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

    private async forceUpdateIssue() {
        if (this.isRefeshing) {
            return;
        }
        if (this._issue) {
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

                let msg = editUI as EditIssueData;
                msg.type = 'update';
                msg.currentUserId = this._currentUserId!;

                // msg.workInProgress = this._issue.assignee.accountId === this._currentUserId &&
                //     issue.transitions.find(t => t.isInitial && t.to.id === issue.status.id) === undefined &&
                //     currentBranches.find(b => b.toLowerCase().indexOf(issue.key.toLowerCase()) !== -1) !== undefined;

                msg.recentPullRequests = [];
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
    }
}