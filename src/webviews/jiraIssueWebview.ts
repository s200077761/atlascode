import * as vscode from 'vscode';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { Action } from '../ipc/messaging';
import { IssueData } from '../ipc/issueMessaging';
import { Issue, emptyIssue, issueOrKey, isIssue, issueExpand, issueFields, issueFromJsonObject } from '../jira/jiraModel';
import { fetchIssue } from "../jira/fetchIssue";
import { Logger } from '../logger';
import { isTransitionIssue, isIssueComment, isIssueAssign, isOpenJiraIssue } from '../ipc/issueActions';
import { transitionIssue } from '../commands/jira/transitionIssue';
import { postComment } from '../commands/jira/postComment';
import { Container } from '../container';
import { emptyWorkingSite } from '../config/model';
import { AuthProvider } from '../atlclients/authInfo';
import { assignIssue } from '../commands/jira/assignIssue';
import { Commands } from '../commands';

export class JiraIssueWebview extends AbstractReactWebview<IssueData,Action> implements InitializingWebview<issueOrKey> {
    private _state: Issue = emptyIssue;
    private _currentUserId?:string;

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

    initialize(data: issueOrKey) {
        if(isIssue(data)) {
            this.updateIssue(data);
            return;
        }

        fetchIssue(data)
            .then((issue: Issue) => {
                this.updateIssue(issue);
            })
            .catch((reason: any) => {
                Logger.error(reason);
            });
    }

    public invalidate() {
        this.forceUpdateIssue();
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if(!handled) {
            switch (e.action) {
                case 'refreshIssue': {
                    handled = true;
                    // TODO: re-fetch the issue
                    this.updateIssue(this._state);
                    break;
                }
                case 'transitionIssue': {
                    if (isTransitionIssue(e)) {
                        handled = true;
                        transitionIssue(e.issue,e.transition).catch((e: any) => {
                            Logger.error(new Error(`error transitioning issue: ${e}`));
                            vscode.window.showErrorMessage('Issue could not be transitioned', e);
                        });
                    }
                    break;
                }
                case 'comment': {
                    if (isIssueComment(e)) {
                        handled = true;
                        postComment(e.issue, e.comment).catch((e: any) => {
                            Logger.error(new Error(`error posting comment: ${e}`));
                            vscode.window.showErrorMessage('Comment could not be posted', e);
                        }).then(() => {
                            this.forceUpdateIssue();
                        });
                    }
                    break;
                }
                case 'assign': {
                    if (isIssueAssign(e)) {
                        handled = true;
                        assignIssue(e.issue, this._currentUserId).catch((e: any) => {
                            Logger.error(new Error(`error posting comment: ${e}`));
                            vscode.window.showErrorMessage('Comment could not be posted', e);
                        }).then(() => {
                            this.forceUpdateIssue();
                        });
                    }
                    break;
                }
                case 'openJiraIssue': {
                    if (isOpenJiraIssue(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.ShowIssue, e.issue);
                        break;
                    }
                }
            }
        }

        return handled;
    }

    public async updateIssue(issue: Issue) {
        this._state = issue;
        if(issue.workingSite !== emptyWorkingSite) {
            this.tenantId = issue.workingSite.id;
        }
        if (!this._currentUserId ) {
            const authInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
            this._currentUserId = authInfo ? authInfo.user.id : undefined;
        }

        if(this._panel){ this._panel.title = `Jira Issue ${issue.key}`; }

        let msg = issue as IssueData;
        msg.type = 'update';
        msg.isAssignedToMe = issue.assignee.accountId === this._currentUserId;
        msg.childIssues = await this.issuesForJQL(`"Parent link"=${issue.key}`);
        this.postMessage(msg);
    }

    async issuesForJQL(jql: string): Promise<Issue[]> {
        let client = await Container.clientManager.jirarequest();

        if (client) {
            return client.search
                .searchForIssuesUsingJqlGet({
                    expand: issueExpand,
                    jql: jql,
                    fields: issueFields
                })
                .then((res: JIRA.Response<JIRA.Schema.SearchResultsBean>) => {
                    const issues = res.data.issues;
                    if (issues) {
                        return issues.map((issue: any) => {
                            return issueFromJsonObject(issue, Container.jiraSiteManager.effectiveSite);
                        });
                    }
                    return [];
                });
        } else {
            Logger.debug("issuesForJQL: client undefined");
        }

        return Promise.reject();
    }

    private async forceUpdateIssue() {
        if(this._state.key !== ""){
            fetchIssue(this._state.key, this._state.workingSite)
                .then((issue: Issue) => {
                    this.updateIssue(issue);
                })
                .catch((reason: any) => {
                    Logger.error(reason);
                });
        }
    }
}
