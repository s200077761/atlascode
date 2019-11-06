import { createEmptyMinimalIssue, MinimalIssue } from 'jira-pi-client';
import * as vscode from 'vscode';
import { issueUrlCopiedEvent, issueWorkStartedEvent } from '../analytics';
import { DetailedSiteInfo, emptySiteInfo, Product, ProductJira } from '../atlclients/authInfo';
import { clientForSite, workspaceRepoFor } from '../bitbucket/bbUtils';
import { BitbucketBranchingModel, Repo } from '../bitbucket/model';
import { assignIssue } from '../commands/jira/assignIssue';
import { showIssue } from '../commands/jira/showIssue';
import { Container } from '../container';
import { isOpenJiraIssue, isStartWork } from '../ipc/issueActions';
import { StartWorkOnIssueData } from '../ipc/issueMessaging';
import { Action, onlineStatus } from '../ipc/messaging';
import { BranchType, RepoData } from '../ipc/prMessaging';
import { fetchMinimalIssue } from '../jira/fetchIssue';
import { transitionIssue } from '../jira/transitionIssue';
import { Logger } from '../logger';
import { RefType, Repository } from '../typings/git';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';

const customBranchType: BranchType = { kind: "Custom", prefix: "" };

export class StartWorkOnIssueWebview extends AbstractReactWebview implements InitializingWebview<MinimalIssue<DetailedSiteInfo>> {
    private _state: MinimalIssue<DetailedSiteInfo> = createEmptyMinimalIssue(emptySiteInfo);
    private _issueKey: string = "";

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Start work on Jira issue";
    }
    public get id(): string {
        return "startWorkOnIssueScreen";
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        return this._state.siteDetails;
    }

    public get productOrUndefined(): Product | undefined {
        return ProductJira;
    }

    async createOrShowIssue(data: MinimalIssue<DetailedSiteInfo>) {
        await super.createOrShow();
        this.initialize(data);
    }

    async initialize(data: MinimalIssue<DetailedSiteInfo>) {
        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        if (this._state.key !== data.key) {
            this.postMessage({
                type: 'update',
                issue: createEmptyMinimalIssue(emptySiteInfo),
                repoData: []
            });
        }
        this.updateIssue(data);
        return;
    }

    public async invalidate() {
        await this.forceUpdateIssue();
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
                    }
                    break;
                }
                case 'copyJiraIssueLink': {
                    handled = true;
                    const linkUrl = `${this._state.siteDetails.baseLinkUrl}/browse/${this._state.key}`;
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
                            const currentUserId = issue.siteDetails.userId;
                            await assignIssue(issue, currentUserId);
                            if (e.setupJira && issue.status.id !== e.transition.to.id) {
                                await transitionIssue(issue, e.transition);
                            }
                            this.postMessage({
                                type: 'startWorkOnIssueResult',
                                successMessage: `<ul><li>Assigned the issue to you</li>${e.setupJira ? `<li>Transitioned status to <code>${e.transition.to.name}</code></li>` : ''}  ${e.setupBitbucket ? `<li>Switched to <code>${e.branchName}</code> branch with upstream set to <code>${e.remote}/${e.branchName}</code></li>` : ''}</ul>`
                            });
                            issueWorkStartedEvent(issue.siteDetails).then(e => { Container.analyticsClient.sendTrackEvent(e); });
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

    public async updateIssue(issue: MinimalIssue<DetailedSiteInfo>) {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {
            this._state = issue;

            if (this._panel) {
                this._panel.title = `Start work on Jira issue ${issue.key}`;
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
                    let branchTypes: BranchType[] = [];

                    const wsRepo = workspaceRepoFor(r);
                    const site = wsRepo.mainSiteRemote.site;
                    if (site) {
                        let branchingModel: BitbucketBranchingModel | undefined = undefined;

                        const bbApi = await clientForSite(site);
                        [, repo, developmentBranch, branchingModel] = await Promise.all(
                            [r.fetch(),
                            bbApi.repositories.get(site),
                            bbApi.repositories.getDevelopmentBranch(site),
                            bbApi.repositories.getBranchingModel(site)
                            ]);
                        href = repo.url;
                        isCloud = site.details.isCloud;

                        if (branchingModel && branchingModel.branch_types) {
                            branchTypes = [...branchingModel.branch_types]
                                .sort((a, b) => { return (a.kind.localeCompare(b.kind)); });
                            if (branchTypes.length > 0) {
                                branchTypes.push(customBranchType);
                            }
                        }
                    }

                    return {
                        uri: r.rootUri.toString(),
                        href: href,
                        remotes: r.state.remotes,
                        defaultReviewers: [],
                        localBranches: r.state.refs.filter(ref => ref.type === RefType.Head && ref.name),
                        remoteBranches: [],
                        branchTypes: branchTypes,
                        developmentBranch: developmentBranch,
                        isCloud: isCloud
                    };
                }));

            let issueClone: MinimalIssue<DetailedSiteInfo> = JSON.parse(JSON.stringify(issue));
            // best effort to set issue to in-progress
            if (!issueClone.status.name.toLowerCase().includes('progress')) {
                const inProgressTransition = issueClone.transitions.find(t => !t.isInitial && t.to.name.toLocaleLowerCase().includes('progress'));
                if (inProgressTransition) {
                    issueClone.status = inProgressTransition.to;
                } else {
                    const firstNonInitialTransition = issueClone.transitions.find(t => !t.isInitial);
                    issueClone.status = firstNonInitialTransition ? firstNonInitialTransition.to : issueClone.status;
                }
            }

            //Pass in the modified issue but keep the original issue as-is so that we're able to see if its status has changed later
            const msg: StartWorkOnIssueData = {
                type: 'update',
                issue: issueClone,
                repoData: repoData
            };
            this.postMessage(msg);
        } catch (e) {
            let err = new Error(`error updating issue: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
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
            } catch (e) {
                Logger.error(e);
                this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
            }
        }
    }
}
