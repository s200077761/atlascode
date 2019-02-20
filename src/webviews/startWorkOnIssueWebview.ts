import * as vscode from 'vscode';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { Action } from '../ipc/messaging';
import { StartWorkOnIssueData, StartWorkOnIssueResult } from '../ipc/issueMessaging';
import { Issue, emptyIssue, issueOrKey, isIssue } from '../jira/jiraModel';
import { fetchIssue } from "../jira/fetchIssue";
import { Logger } from '../logger';
import { isOpenJiraIssue, isStartWork } from '../ipc/issueActions';
import { Container } from '../container';
import { isEmptySite } from '../config/model';
import { AuthProvider } from '../atlclients/authInfo';
import { Commands } from '../commands';
import { RepositoriesApi } from '../bitbucket/repositories';
import { RefType } from '../typings/git';
import { RepoData } from '../ipc/prMessaging';
import { assignIssue } from '../commands/jira/assignIssue';
import { transitionIssue } from '../commands/jira/transitionIssue';

export class StartWorkOnIssueWebview extends AbstractReactWebview<StartWorkOnIssueData | StartWorkOnIssueResult, Action> implements InitializingWebview<issueOrKey> {
    private _state: Issue = emptyIssue;

    constructor(extensionPath: string) {
        super(extensionPath);
        this.tenantId = Container.jiraSiteManager.effectiveSite.id;
    }

    public get title(): string {
        return "Start work on Jira issue";
    }
    public get id(): string {
        return "startWorkOnIssueScreen";
    }

    createOrShowIssue(data: issueOrKey) {
        super.createOrShow();
        this.initialize(data);
    }

    initialize(data: issueOrKey) {
        if (isIssue(data)) {
            if (this._state.key !== data.key) {
                this.postMessage({
                    type: 'update',
                    issue: emptyIssue,
                    repoData: []
                });
            }
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

        if (!handled) {
            switch (e.action) {
                case 'refreshIssue': {
                    handled = true;
                    // TODO: re-fetch the issue
                    this.updateIssue(this._state);
                    break;
                }
                case 'openJiraIssue': {
                    if (isOpenJiraIssue(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.ShowIssue, e.issue);
                        break;
                    }
                }
                case 'startWork': {
                    if (isStartWork(e)) {
                        try {
                            const issue = this._state;
                            if (e.setupBitbucket) {
                                const repo = Container.bitbucketContext.getRepository(vscode.Uri.parse(e.repoUri))!;
                                await repo.createBranch(e.branchName, true, e.sourceBranchName);
                            }
                            const authInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
                            const currentUserId = authInfo!.user.id;
                            await assignIssue(issue, currentUserId);
                            if (e.setupJira) {
                                await transitionIssue(issue, e.transition);
                            }
                            this.postMessage({
                                type: 'startWorkOnIssueResult',
                                successMessage: `Assigned the issue to you${e.setupJira ? ` and transitioned status to "${e.transition.to.name}"` : ''}  ${e.setupBitbucket ? `, and switched to "${e.branchName}" branch with upstream set to "${e.remote}"` : ''}.`
                            });
                        }
                        catch (e) {
                            this.postMessage({
                                type: 'startWorkOnIssueResult',
                                error: JSON.stringify(e)
                            });
                        }
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

        if (this._panel) {
            this._panel.title = `Start work on Jira issue ${issue.key}`;
        }

        const repoData: RepoData[] = [];
        const repos = Container.bitbucketContext.getAllRepositores();
        for (let i = 0; i < repos.length; i++) {
            const r = repos[i];
            if (r.state.remotes.length === 0) {
                break;
            }

            const [, repo] = await Promise.all([r.fetch(), RepositoriesApi.get(r.state.remotes[0])]);
            const mainbranch = repo.mainbranch ? repo.mainbranch!.name : undefined;
            await repoData.push({
                uri: r.rootUri.toString(),
                href: repo.links!.html!.href,
                remotes: r.state.remotes,
                localBranches: await Promise.all(r.state.refs.filter(ref => ref.type === RefType.Head && ref.name).map(ref => r.getBranch(ref.name!))),
                remoteBranches: [],
                mainbranch: mainbranch
            });
        }

        // best effort to set issue to in-progress
        if (!issue.status.name.toLowerCase().includes('progress')) {
            const inProgressTransition = issue.transitions.find(t => !t.isInitial && t.to.name.toLocaleLowerCase().includes('progress'));
            if (inProgressTransition) {
                issue.status = inProgressTransition.to;
            } else {
                const firstNonInitialTransition = issue.transitions.find(t => !t.isInitial);
                issue.status = firstNonInitialTransition ? firstNonInitialTransition.to : issue.status;
            }
        }

        const msg: StartWorkOnIssueData = {
            type: 'update',
            issue: issue,
            repoData: repoData
        };
        this.postMessage(msg);
    }

    private async forceUpdateIssue() {
        if (this._state.key !== "") {
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
