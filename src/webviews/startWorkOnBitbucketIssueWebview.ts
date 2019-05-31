import * as vscode from 'vscode';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { Action, HostErrorMessage, onlineStatus } from '../ipc/messaging';
import { StartWorkOnIssueResult } from '../ipc/issueMessaging';
import { Logger } from '../logger';
import { isStartWork } from '../ipc/issueActions';
import { Container } from '../container';
import { Commands } from '../commands';
import { RepositoriesApi } from '../bitbucket/repositories';
import { PullRequestApi } from '../bitbucket/pullRequests';
import { Repository, RefType } from '../typings/git';
import { RepoData } from '../ipc/prMessaging';
import { bbIssueUrlCopiedEvent, bbIssueWorkStartedEvent } from '../analytics';
import { StartWorkOnBitbucketIssueData } from '../ipc/bitbucketIssueMessaging';
import { BitbucketIssuesApi } from '../bitbucket/bbIssues';
import { isOpenBitbucketIssueAction } from '../ipc/bitbucketIssueActions';
import { Repo } from '../bitbucket/model';

type Emit = StartWorkOnBitbucketIssueData | StartWorkOnIssueResult | HostErrorMessage;
export class StartWorkOnBitbucketIssueWebview extends AbstractReactWebview<Emit, Action> implements InitializingWebview<Bitbucket.Schema.Issue> {
    private _state: Bitbucket.Schema.Issue;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Start work on Bitbucket issue";
    }
    public get id(): string {
        return "startWorkOnIssueScreen";
    }

    async createOrShowIssue(data: Bitbucket.Schema.Issue) {
        await super.createOrShow();
        this.initialize(data);
    }

    initialize(data: Bitbucket.Schema.Issue) {
        this._state = data;

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }
        this.invalidate();
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
                case 'openBitbucketIssue': {
                    if (isOpenBitbucketIssueAction(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.ShowBitbucketIssue, e.issue);
                        break;
                    }
                }
                case 'copyBitbucketIssueLink': {
                    handled = true;
                    const linkUrl = this._state.links!.html!.href!;
                    await vscode.env.clipboard.writeText(linkUrl);
                    vscode.window.showInformationMessage(`Copied issue link to clipboard - ${linkUrl}`);
                    bbIssueUrlCopiedEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
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
                            await BitbucketIssuesApi.assign(issue, (await Container.bitbucketContext.currentUser()).accountId!);
                            this.postMessage({
                                type: 'startWorkOnIssueResult',
                                successMessage: `<ul><li>Assigned the issue to you</li>${e.setupBitbucket ? `<li>Switched to "${e.branchName}" branch with upstream set to "${e.remote}/${e.branchName}"</li>` : ''}</ul>`
                            });
                            bbIssueWorkStartedEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
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

    public async updateIssue(issue: Bitbucket.Schema.Issue) {
        this._state = issue;

        if (this._panel) {
            this._panel.title = `Start work on Bitbucket issue #${issue.id}`;
        }

        const repoData: RepoData[] = [];
        const repos = Container.bitbucketContext
            ? Container.bitbucketContext.getAllRepositores()
            : [];
        for (let i = 0; i < repos.length; i++) {
            const r = repos[i];
            if (r.state.remotes.length === 0) {
                break;
            }

            let repo: Repo | undefined = undefined;
            let developmentBranch = undefined;
            let href = undefined;
            if (Container.bitbucketContext.isBitbucketRepo(r)) {
                [, repo, developmentBranch] = await Promise.all([r.fetch(), RepositoriesApi.get(PullRequestApi.getBitbucketRemotes(r)[0]), RepositoriesApi.getDevelopmentBranch(PullRequestApi.getBitbucketRemotes(r)[0])]);
                href = repo.url;
            }

            await repoData.push({
                uri: r.rootUri.toString(),
                href: href,
                remotes: r.state.remotes,
                defaultReviewers: [],
                localBranches: await Promise.all(r.state.refs.filter(ref => ref.type === RefType.Head && ref.name).map(ref => r.getBranch(ref.name!))),
                remoteBranches: [],
                developmentBranch: developmentBranch
            });
        }

        const msg: StartWorkOnBitbucketIssueData = {
            type: 'startWorkOnBitbucketIssueData',
            issue: issue,
            repoData: repoData
        };
        this.postMessage(msg);
    }

    private async forceUpdateIssue() {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {
            const updatedIssue = await BitbucketIssuesApi.refetch(this._state);
            this.updateIssue(updatedIssue);
        }
        catch (e) {
            Logger.error(e);
            this.postMessage({ type: 'error', reason: e });
        } finally {
            this.isRefeshing = false;
        }
    }
}
