import * as vscode from 'vscode';
import { bbIssueUrlCopiedEvent, bbIssueWorkStartedEvent } from '../analytics';
import { DetailedSiteInfo, Product, ProductBitbucket } from '../atlclients/authInfo';
import { clientForRemote, clientForSite, firstBitbucketRemote, siteDetailsForRemote, workspaceRepoFor } from '../bitbucket/bbUtils';
import { BitbucketIssue, Repo } from '../bitbucket/model';
import { Commands } from '../commands';
import { Container } from '../container';
import { isOpenBitbucketIssueAction } from '../ipc/bitbucketIssueActions';
import { StartWorkOnBitbucketIssueData } from '../ipc/bitbucketIssueMessaging';
import { isStartWork } from '../ipc/issueActions';
import { Action, onlineStatus } from '../ipc/messaging';
import { RepoData } from '../ipc/prMessaging';
import { Logger } from '../logger';
import { RefType, Repository } from '../typings/git';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';

export class StartWorkOnBitbucketIssueWebview extends AbstractReactWebview implements InitializingWebview<BitbucketIssue> {
    private _state: BitbucketIssue;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Start work on Bitbucket issue";
    }
    public get id(): string {
        return "startWorkOnIssueScreen";
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        if (this._state) {
            return this._state.site.details;
        }

        return undefined;
    }

    public get productOrUndefined(): Product | undefined {
        return ProductBitbucket;
    }

    async createOrShowIssue(data: BitbucketIssue) {
        await super.createOrShow();
        this.initialize(data);
    }

    initialize(data: BitbucketIssue) {
        this._state = data;

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }
        this.invalidate();
    }

    public async invalidate() {
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
                        vscode.commands.executeCommand(Commands.ShowBitbucketIssue, this._state);
                    }
                    break;
                }
                case 'copyBitbucketIssueLink': {
                    handled = true;
                    const linkUrl = this._state.data.links!.html!.href!;
                    await vscode.env.clipboard.writeText(linkUrl);
                    vscode.window.showInformationMessage(`Copied issue link to clipboard - ${linkUrl}`);
                    bbIssueUrlCopiedEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
                    break;
                }
                case 'startWork': {
                    if (isStartWork(e)) {
                        try {
                            const issue = this._state;
                            const repo = Container.bitbucketContext.getRepository(vscode.Uri.parse(e.repoUri))!;
                            if (e.setupBitbucket) {
                                await this.createOrCheckoutBranch(repo, e.branchName, e.sourceBranchName, e.remote);
                            }
                            const remote = repo.state.remotes.find(r => r.name === e.remote);

                            const bbApi = await clientForRemote(remote!);
                            await bbApi.issues!.assign(issue, siteDetailsForRemote(remote!)!.userId);
                            this.postMessage({
                                type: 'startWorkOnIssueResult',
                                successMessage: `<ul><li>Assigned the issue to you</li>${e.setupBitbucket ? `<li>Switched to "${e.branchName}" branch with upstream set to "${e.remote}/${e.branchName}"</li>` : ''}</ul>`
                            });

                            const site: DetailedSiteInfo | undefined = siteDetailsForRemote(remote!);
                            if (site) {
                                bbIssueWorkStartedEvent(site).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                            }
                        } catch (e) {
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
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
        } catch (reason) {
            await repo.createBranch(destBranch, true, sourceBranch);
            await repo.push(remote, destBranch, true);
            return;
        }

        await repo.checkout(destBranch);
    }

    public async updateIssue(issue: BitbucketIssue) {
        this._state = issue;

        if (this._panel) {
            this._panel.title = `Start work on Bitbucket issue #${issue.data.id}`;
        }

        const repos = Container.bitbucketContext
            ? Container.bitbucketContext.getAllRepositories()
            : [];

        const repoData: RepoData[] = await Promise.all(repos
            .filter(r => r.state.remotes.length > 0)
            .map(async r => {
                let repo: Repo | undefined = undefined;
                let developmentBranch = undefined;
                let href = undefined;
                let isCloud = false;
                const wsRepo = workspaceRepoFor(r);
                const site = wsRepo.mainSiteRemote.site;
                if (site) {
                    const remote = firstBitbucketRemote(r);
                    const bbApi = await clientForRemote(remote);
                    [, repo, developmentBranch] = await Promise.all([r.fetch(), bbApi.repositories.get(site), bbApi.repositories.getDevelopmentBranch(site)]);
                    href = repo.url;
                    isCloud = siteDetailsForRemote(remote)!.isCloud;
                }

                return {
                    workspaceRepo: wsRepo,
                    href: href,
                    defaultReviewers: [],
                    localBranches: r.state.refs.filter(ref => ref.type === RefType.Head && ref.name),
                    remoteBranches: [],
                    branchTypes: [],
                    developmentBranch: developmentBranch,
                    isCloud: isCloud
                };
            }));

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
            const bbApi = await clientForSite(this._state.site);
            const updatedIssue = await bbApi.issues!.refetch(this._state);
            this.updateIssue(updatedIssue);
        } catch (e) {
            Logger.error(e);
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
        } finally {
            this.isRefeshing = false;
        }
    }
}
