import { commands } from 'vscode';
import { bbIssueCreatedEvent } from '../analytics';
import { DetailedSiteInfo, Product, ProductBitbucket } from '../atlclients/authInfo';
import { clientForSite } from '../bitbucket/bbUtils';
import { BitbucketIssue, BitbucketSite, SiteRemote, WorkspaceRepo } from '../bitbucket/model';
import { Commands } from '../commands';
import { Container } from '../container';
import { CreateBitbucketIssueAction, isCreateBitbucketIssueAction } from '../ipc/bitbucketIssueActions';
import { Action, onlineStatus } from '../ipc/messaging';
import { RepoData } from '../ipc/prMessaging';
import { Logger } from '../logger';
import { AbstractReactWebview } from './abstractWebview';

export class CreateBitbucketIssueWebview extends AbstractReactWebview {
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return 'Create Bitbucket issue';
    }
    public get id(): string {
        return 'createBitbucketIssueScreen';
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        const repos = Container.bitbucketContext.getBitbucketRepositories();
        if (repos.length > 0) {
            return repos[0].mainSiteRemote.site!.details;
        }

        return undefined;
    }

    public get productOrUndefined(): Product | undefined {
        return ProductBitbucket;
    }

    public async invalidate() {
        if (Container.onlineDetector.isOnline()) {
            await this.updateFields();
        } else {
            this.postMessage(onlineStatus(false));
        }
    }

    async updateFields() {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {
            const repoData: RepoData[] = [];
            const repos = Container.bitbucketContext.getBitbucketRepositories();
            for (let i = 0; i < repos.length; i++) {
                const wsRepo = repos[i];
                const site = wsRepo.mainSiteRemote.site!;

                const bbApi = await clientForSite(site);
                const repo = await bbApi.repositories.get(site);

                let parentRepoIssueTrackerEnabled = false;
                let parentSiteRemote: SiteRemote | undefined = undefined;
                if (repo.parentFullName) {
                    const parentSite: BitbucketSite = {
                        ...site,
                        ownerSlug: repo.parentFullName.slice(0, repo.parentFullName.lastIndexOf('/')),
                        repoSlug: repo.parentFullName.slice(repo.parentFullName.lastIndexOf('/') + 1)
                    };

                    const parentRemoteName = `${repo.parentFullName} (parent repo)`;
                    parentSiteRemote = {
                        remote: { name: parentRemoteName, fetchUrl: '', isReadOnly: true },
                        site: parentSite
                    };

                    const parentBbApi = await clientForSite(parentSite);
                    parentRepoIssueTrackerEnabled = (await parentBbApi.repositories.get(parentSite))
                        .issueTrackerEnabled;
                }

                if (!repo.issueTrackerEnabled && !parentRepoIssueTrackerEnabled) {
                    continue;
                }

                const wsRepoClone: WorkspaceRepo = {
                    rootUri: wsRepo.rootUri,
                    mainSiteRemote: repo.issueTrackerEnabled ? wsRepo.mainSiteRemote : parentSiteRemote!,
                    siteRemotes: []
                };
                if (repo.issueTrackerEnabled) {
                    wsRepoClone.siteRemotes.push(wsRepo.mainSiteRemote);
                }
                if (parentRepoIssueTrackerEnabled) {
                    wsRepoClone.siteRemotes.push(parentSiteRemote!);
                }

                repoData.push({
                    workspaceRepo: wsRepoClone,
                    href: repo.url,
                    avatarUrl: repo.avatarUrl,
                    localBranches: [],
                    remoteBranches: [],
                    branchTypes: [],
                    isCloud: true
                });
            }

            if (repoData.length > 0) {
                this.postMessage({ type: 'createBitbucketIssueData', repoData: repoData });
            } else {
                const reason =
                    Container.siteManager.getSiteForHostname(ProductBitbucket, 'bitbucket.org') === undefined
                        ? 'Authenticate with Bitbucket Cloud and try again'
                        : 'No Bitbucket Cloud repositories with issue tracker enabled found in the current workspace in VS Code';
                this.postMessage({ type: 'error', reason: this.formatErrorReason(reason, 'No Bitbucket Cloud repos') });
            }
        } catch (e) {
            Logger.error(new Error(`error updating issue fields: ${e}`));
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
        } finally {
            this.isRefeshing = false;
        }
    }

    async createOrShow(): Promise<void> {
        await super.createOrShow();
        await this.invalidate();
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if (!handled) {
            switch (e.action) {
                case 'create': {
                    if (isCreateBitbucketIssueAction(e)) {
                        handled = true;
                        try {
                            await this.createIssue(e);
                        } catch (e) {
                            Logger.error(new Error(`error creating bitbucket issue: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                    break;
                }
                case 'refresh': {
                    handled = true;
                    await this.invalidate();
                    break;
                }
            }
        }

        return handled;
    }

    private async createIssue(createIssueAction: CreateBitbucketIssueAction) {
        const { site: site, title, description, kind, priority } = createIssueAction;

        const bbApi = await clientForSite(site);
        let issue: BitbucketIssue = await bbApi.issues!.create(site, title, description, kind, priority);
        commands.executeCommand(Commands.ShowBitbucketIssue, issue);
        commands.executeCommand(Commands.BitbucketIssuesRefresh);

        bbIssueCreatedEvent(site.details).then(e => {
            Container.analyticsClient.sendTrackEvent(e);
        });

        this.hide();
    }
}
