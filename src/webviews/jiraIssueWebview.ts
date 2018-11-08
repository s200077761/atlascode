import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { Action } from '../ipc/messaging';
import { IssueData } from '../ipc/issueMessaging';
import { JiraIssue } from '../jira/jiraIssue';
import { fetchIssue } from "../jira/fetchIssue";
import { Logger } from '../logger';

export class JiraIssueWebview extends AbstractReactWebview<IssueData,Action> implements InitializingWebview<JiraIssue.issueOrKey> {
    private _state: JiraIssue.Issue = JiraIssue.emptyIssue;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Jira Issue";
    }
    public get id(): string {
        return "jiraIssueView";
    }

    initialize(data: JiraIssue.issueOrKey) {
        if(JiraIssue.isIssue(data)) {
            this.updateIssue(data);
            return;
        }

        fetchIssue(data)
        .then((issue: JiraIssue.Issue) => {
            this.updateIssue(issue);
        })
        .catch((reason: any) => {
            Logger.error(reason);
        });
    }

    public invalidate() {
        this.forceUpdateIssue();
    }

    protected onMessageReceived(e: Action): boolean {
        let handled = super.onMessageReceived(e);

        if(!handled) {
            switch (e.action) {
                case 'refreshIssue': {
                    handled = true;
                    // TODO: re-fetch the issue
                    this.updateIssue(this._state);
                }
            }
        }

        return handled;
    }

    public async updateIssue(issue: JiraIssue.Issue) {
        this._state = issue;
        if(this._panel){ this._panel.title = `Jira Issue ${issue.key}`; }

        let msg = issue as IssueData;
        msg.type = 'update';
        this.postMessage(msg);
    }

    private async forceUpdateIssue() {
        if(this._state.key !== ""){
            fetchIssue(this._state.key)
                .then((issue: JiraIssue.Issue) => {
                    this.updateIssue(issue);
                })
                .catch((reason: any) => {
                    Logger.error(reason);
                });
        }
    }
}
