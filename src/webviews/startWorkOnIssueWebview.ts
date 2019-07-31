import * as vscode from 'vscode';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { Action, HostErrorMessage, onlineStatus } from '../ipc/messaging';
import { StartWorkOnIssueData, StartWorkOnIssueResult } from '../ipc/issueMessaging';
import { Logger } from '../logger';
import { isOpenJiraIssue, isStartWork } from '../ipc/issueActions';
import { Container } from '../container';
import { ProductJira, isEmptySiteInfo } from '../atlclients/authInfo';
import { Repository, RefType, Remote } from '../typings/git';
import { RepoData } from '../ipc/prMessaging';
import { assignIssue } from '../commands/jira/assignIssue';
import { transitionIssue } from '../commands/jira/transitionIssue';
import { issueWorkStartedEvent, issueUrlCopiedEvent } from '../analytics';
import { getBitbucketRemotes, siteDetailsForRepository } from '../bitbucket/bbUtils';
import { Repo, BitbucketBranchingModel } from '../bitbucket/model';
import { RepositoryProvider } from '../bitbucket/repoProvider';
import { fetchMinimalIssue } from '../jira/fetchIssue';
import { MinimalIssueOrKey, MinimalIssue } from '../jira/jira-client/model/entities';
import { emptyMinimalIssue } from '../jira/jira-client/model/emptyEntities';
import { showIssue } from '../commands/jira/showIssue';

type EMIT = StartWorkOnIssueData | StartWorkOnIssueResult | HostErrorMessage;
export class StartWorkOnIssueWebview extends AbstractReactWebview<EMIT, Action> implements InitializingWebview<MinimalIssueOrKey> {
    private _state: MinimalIssue = emptyMinimalIssue;
    private _issueKey: string = "";

    constructor(extensionPath: string) {
        super(extensionPath);
        this.tenantId = Container.siteManager.effectiveSite(ProductJira).id;
    }

    public get title(): string {
        return "Start work on Jira issue";
    }
    public get id(): string {
        return "startWorkOnIssueScreen";
    }

    async createOrShowIssue(data: MinimalIssue) {
        await super.createOrShow();
        this.initialize(data);
    }

    async initialize(data: MinimalIssue) {
        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        if (this._state.key !== data.key) {
            this.postMessage({
                type: 'update',
                issue: emptyMinimalIssue,
                repoData: []
            });
        }
        this.updateIssue(data);
        return;
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
                    this.forceUpdateIssue();
                    break;
                }
                case 'openJiraIssue': {
                    if (isOpenJiraIssue(e)) {
                        handled = true;
                        showIssue(e.issueOrKey);
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
                case 'startWork': {
                    if (isStartWork(e)) {
                        try {
                            const issue = this._state;
                            if (e.setupBitbucket) {
                                const repo = Container.bitbucketContext.getRepository(vscode.Uri.parse(e.repoUri))!;
                                await this.createOrCheckoutBranch(repo, e.branchName, e.sourceBranchName, e.remote);
                            }
                            const authInfo = await Container.authManager.getAuthInfo(issue.siteDetails);
                            const currentUserId = authInfo!.user.id;
                            await assignIssue(issue, currentUserId);
                            if (e.setupJira) {
                                await transitionIssue(issue, e.transition);
                            }
                            this.postMessage({
                                type: 'startWorkOnIssueResult',
                                successMessage: `<ul><li>Assigned the issue to you</li>${e.setupJira ? `<li>Transitioned status to <code>${e.transition.to.name}</code></li>` : ''}  ${e.setupBitbucket ? `<li>Switched to <code>${e.branchName}</code> branch with upstream set to <code>${e.remote}/${e.branchName}</code></li>` : ''}</ul>`
                            });
                            issueWorkStartedEvent(issue.siteDetails.id).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                        }
                        catch (e) {
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                }
            }
        }

        return handled;
    }

    async createOrCheckoutBranch(repo: Repository, destBranch: string, sourceBranch: string, remote: string): Promise<void> {
        await repo.fetch(remote, sourceBranch);

        try {
            await repo.getBranch(destBranch);
        }
        catch (reason) {
            await repo.createBranch(destBranch, true, sourceBranch);
            await repo.push(remote, destBranch, true);
            return;
        }

        await repo.checkout(destBranch);
    }

    public async updateIssue(issue: MinimalIssue) {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {
            this._state = issue;
            if (!isEmptySiteInfo(issue.siteDetails)) {
                this.tenantId = issue.siteDetails.id;
            }

            if (this._panel) {
                this._panel.title = `Start work on Jira issue ${issue.key}`;
            }

            const repoData: RepoData[] = [];
            const repos = Container.bitbucketContext
                ? Container.bitbucketContext.getAllRepositores()
                : [];
            for (let i = 0; i < repos.length; i++) {
                const r = repos[i];
                const remotes: Remote[] = r.state.remotes.length > 0
                    ? r.state.remotes
                    : [{ name: 'NO_GIT_REMOTE_FOUND', isReadOnly: true }];

                let repo: Repo | undefined = undefined;
                let developmentBranch = undefined;
                let href = undefined;
                let branchingModel: BitbucketBranchingModel | undefined = undefined;
                if (Container.bitbucketContext.isBitbucketRepo(r)) {
                    const remotes = getBitbucketRemotes(r);
                    if (remotes.length > 0) {
                        [, repo, developmentBranch, branchingModel] = await Promise.all(
                            [r.fetch(),
                            RepositoryProvider.forRemote(remotes[0]).get(remotes[0]),
                            RepositoryProvider.forRemote(remotes[0]).getDevelopmentBranch(remotes[0]),
                            RepositoryProvider.forRemote(remotes[0]).getBranchingModel(remotes[0])
                            ]);
                        href = repo.url;
                    }
                }

                await repoData.push({
                    uri: r.rootUri.toString(),
                    href: href,
                    remotes: remotes,
                    defaultReviewers: [],
                    localBranches: await Promise.all(r.state.refs.filter(ref => ref.type === RefType.Head && ref.name).map(ref => r.getBranch(ref.name!))),
                    remoteBranches: [],
                    developmentBranch: developmentBranch,
                    branchingModel: branchingModel,
                    isCloud: siteDetailsForRepository(r)!.isCloud
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
        } catch (e) {
            let err = new Error(`error updating issue: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: `error updating issue: ${e}` });
        } finally {
            this.isRefeshing = false;
        }
    }

    private async forceUpdateIssue() {
        let key = this._issueKey;
        if (key !== "") {
            try {
                let issue = await fetchMinimalIssue(key, this._state.siteDetails);
                this.updateIssue(issue);
            }
            catch (e) {
                Logger.error(e);
                this.postMessage({ type: 'error', reason: e });
            }
        }
    }
}
