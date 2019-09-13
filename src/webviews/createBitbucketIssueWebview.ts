import { AbstractReactWebview } from './abstractWebview';
import { Action, onlineStatus } from '../ipc/messaging';
import { commands, Uri } from 'vscode';
import { Logger } from '../logger';
import { Container } from '../container';
import { Commands } from '../commands';
import { isCreateBitbucketIssueAction, CreateBitbucketIssueAction } from '../ipc/bitbucketIssueActions';
import { RepoData } from '../ipc/prMessaging';
import { bbIssueCreatedEvent } from '../analytics';
import { getBitbucketRemotes, clientForRemote, firstBitbucketRemote, siteDetailsForRemote } from '../bitbucket/bbUtils';
import { DetailedSiteInfo } from '../atlclients/authInfo';

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
        const repos = Container.bitbucketContext.getBitbucketRepositores();
        if (repos.length > 0) {
            return siteDetailsForRemote(firstBitbucketRemote(repos[0]));
        }

        return undefined;
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
            const repos = Container.bitbucketContext.getBitbucketRepositores();
            for (let i = 0; i < repos.length; i++) {
                const r = repos[i];
                const remotes = getBitbucketRemotes(r);
                const remote = firstBitbucketRemote(r);

                const bbApi = await clientForRemote(remote);
                const repo = await bbApi.repositories.get(remote);
                if (!repo.issueTrackerEnabled) {
                    continue;
                }

                repoData.push({
                    uri: r.rootUri.toString(),
                    href: repo.url,
                    avatarUrl: repo.avatarUrl,
                    remotes: remotes,
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
            this.postMessage({ type: 'error', reason: e });
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
                            this.postMessage({ type: 'error', reason: e });
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
        const { href, title, description, kind, priority } = createIssueAction;

        // TODO [VSCODE-568] Add remote to create bitbucket issue action
        const repo = Container.bitbucketContext.getRepository(Uri.parse(href));
        const remote = firstBitbucketRemote(repo!);
        const bbApi = await clientForRemote(remote);
        let issue = await bbApi.issues!.create(href, title, description, kind, priority);
        commands.executeCommand(Commands.ShowBitbucketIssue, issue);
        commands.executeCommand(Commands.BitbucketIssuesRefresh);

        const site: DetailedSiteInfo | undefined = siteDetailsForRemote(remote);

        if (site) {
            bbIssueCreatedEvent(site).then(e => { Container.analyticsClient.sendTrackEvent(e); });
        }

        this.hide();
    }
}
