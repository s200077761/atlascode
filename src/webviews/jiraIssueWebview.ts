import { window } from 'vscode';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { Action } from '../ipc/messaging';
import { IssueData } from '../ipc/issueMessaging';
import { Issue, emptyIssue, issueOrKey, isIssue } from '../jira/jiraModel';
import { fetchIssue } from "../jira/fetchIssue";
import { Logger } from '../logger';
import { isTransitionIssue, isIssueComment } from '../ipc/issueActions';
import { transitionIssue } from '../commands/jira/transitionIssue';
import { postComment } from '../commands/jira/postComment';
import { Container } from '../container';
import { emptyWorkingSite } from '../config/model';

export class JiraIssueWebview extends AbstractReactWebview<IssueData,Action> implements InitializingWebview<issueOrKey> {
    private _state: Issue = emptyIssue;

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
                }
                case 'transitionIssue': {
                    if (isTransitionIssue(e)) {
                        handled = true;
                        transitionIssue(e.issue,e.transition).catch((e: any) => {
                            Logger.error(new Error(`error transitioning issue: ${e}`));
                            window.showErrorMessage('Issue could not be transitioned', e);
                        });
                    }
                }
                case 'comment': {
                    if (isIssueComment(e)) {
                        handled = true;
                        postComment(e.issue, e.comment).catch((e: any) => {
                            Logger.error(new Error(`error posting comment: ${e}`));
                            window.showErrorMessage('Comment could not be posted', e);
                        }).then(() => {
                            this.forceUpdateIssue();
                        });
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

        if(this._panel){ this._panel.title = `Jira Issue ${issue.key}`; }

        let msg = issue as IssueData;
        msg.type = 'update';
        this.postMessage(msg);
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
