import { AbstractReactWebview } from './abstractWebview';
import { Action, HostErrorMessage, onlineStatus } from '../ipc/messaging';
import { commands } from 'vscode';
import { Logger } from '../logger';
import { Container } from '../container';
import { PullRequestApi } from '../bitbucket/pullRequests';
import { RepositoriesApi } from '../bitbucket/repositories';
import { Commands } from '../commands';
import { BitbucketIssuesApi } from '../bitbucket/bbIssues';
import { CreateBitbucketIssueData } from '../ipc/bitbucketIssueMessaging';
import { isCreateBitbucketIssueAction, CreateBitbucketIssueAction } from '../ipc/bitbucketIssueActions';
import { RepoData } from '../ipc/prMessaging';
import { bbIssueCreatedEvent } from '../analytics';

type Emit = CreateBitbucketIssueData | HostErrorMessage;
export class CreateBitbucketIssueWebview extends AbstractReactWebview<Emit, Action> {

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Create Bitbucket issue";
    }
    public get id(): string {
        return "createBitbucketIssueScreen";
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
                const bbRemotes = PullRequestApi.getBitbucketRemotes(r);
                if (Array.isArray(bbRemotes) && bbRemotes.length === 0) {
                    continue;
                }

                const repo = await RepositoriesApi.get(bbRemotes[0]);
                if (!repo.issueTrackerEnabled) {
                    continue;
                }

                repoData.push({
                    uri: r.rootUri.toString(),
                    href: repo.url,
                    avatarUrl: repo.avatarUrl,
                    remotes: bbRemotes,
                    defaultReviewers: [],
                    localBranches: [],
                    remoteBranches: []
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

        let issue = await BitbucketIssuesApi.create(href, title, description, kind, priority);
        commands.executeCommand(Commands.ShowBitbucketIssue, issue);
        commands.executeCommand(Commands.BitbucketIssuesRefresh);
        bbIssueCreatedEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
        this.hide();
    }
}
