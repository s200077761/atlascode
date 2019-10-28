import { commands, Uri } from 'vscode';
import { bbIssueCreatedEvent } from '../analytics';
import { DetailedSiteInfo, Product, ProductBitbucket } from '../atlclients/authInfo';
import { clientForSite, firstBitbucketRemote, siteDetailsForRemote, workspaceRepoFor } from '../bitbucket/bbUtils';
import { BitbucketIssue } from '../bitbucket/model';
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
        return "Create Bitbucket issue";
    }
    public get id(): string {
        return "createBitbucketIssueScreen";
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        const repos = Container.bitbucketContext.getBitbucketRepositories();
        if (repos.length > 0) {
            return siteDetailsForRemote(firstBitbucketRemote(repos[0]));
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
                const r = repos[i];
                const wsRepo = workspaceRepoFor(r);
                const site = wsRepo.mainSiteRemote.site!;

                const bbApi = await clientForSite(site);
                const repo = await bbApi.repositories.get(site);
                if (!repo.issueTrackerEnabled) {
                    continue;
                }

                repoData.push({
                    uri: r.rootUri.toString(),
                    href: repo.url,
                    avatarUrl: repo.avatarUrl,
                    remotes: wsRepo.siteRemotes.map(r => r.remote),
                    defaultReviewers: [],
                    localBranches: [],
                    remoteBranches: [],
                    branchTypes: [],
                    isCloud: true
                });
            }

            this.postMessage({ type: 'createBitbucketIssueData', repoData: repoData });
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
        const { repoUri: uri, title, description, kind, priority } = createIssueAction;

        // TODO [VSCODE-568] Add remote to create bitbucket issue action
        const repo = Container.bitbucketContext.getRepository(Uri.parse(uri));
        const wsRepo = workspaceRepoFor(repo!);
        const site = wsRepo.mainSiteRemote.site;
        if (!site) {
            throw new Error('Error creating issue: not authenticated');
        }
        const bbApi = await clientForSite(site);
        let issue: BitbucketIssue = await bbApi.issues!.create(site, title, description, kind, priority);
        commands.executeCommand(Commands.ShowBitbucketIssue, issue);
        commands.executeCommand(Commands.BitbucketIssuesRefresh);

        bbIssueCreatedEvent(site.details).then(e => { Container.analyticsClient.sendTrackEvent(e); });

        this.hide();
    }
}
