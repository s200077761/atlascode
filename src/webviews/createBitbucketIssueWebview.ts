import { AbstractReactWebview } from './abstractWebview';
import { Action, HostErrorMessage } from '../ipc/messaging';
import { commands } from 'vscode';
import { Logger } from '../logger';
import { Container } from '../container';
import { PullRequestApi } from '../bitbucket/pullRequests';
import { RepositoriesApi } from '../bitbucket/repositories';
import { Commands } from '../commands';
import { BitbucketIssuesApi } from '../bitbucket/bbIssues';
import { RepoData, CreateBitbucketIssueData } from '../ipc/bitbucketIssueMessaging';
import { isCreateBitbucketIssueAction, CreateBitbucketIssueAction } from '../ipc/bitbucketIssueActions';

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
        const repoData: RepoData[] = [];
        const repos = Container.bitbucketContext.getBitbucketRepositores();
        for (let i = 0; i < repos.length; i++) {
            const r = repos[i];
            const bbRemotes = PullRequestApi.getBitbucketRemotes(r);
            if (Array.isArray(bbRemotes) && bbRemotes.length === 0) {
                continue;
            }

            const repo = await RepositoriesApi.get(bbRemotes[0]);
            if (!repo.has_issues) {
                continue;
            }

            repoData.push({
                uri: r.rootUri.toString(),
                href: repo.links!.html!.href!,
                avatarUrl: repo.links!.avatar!.href!
            });
        }

        this.postMessage({ type: 'createBitbucketIssueData', repoData: repoData });
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
                        this.createIssue(e)
                            .catch((e: any) => {
                                Logger.error(new Error(`error creating bitbucket issue: ${e}`));
                                this.postMessage({ type: 'error', reason: e });
                            });
                    }
                    break;
                }
            }
        }

        return handled;
    }

    private async createIssue(createIssueAction: CreateBitbucketIssueAction) {
        const { href, title, description, kind, priority } = createIssueAction;

        await BitbucketIssuesApi.create(href, title, description, kind, priority)
            .then((issue: Bitbucket.Schema.Issue) => {
                commands.executeCommand(Commands.ShowBitbucketIssue, issue);
                //prCreatedEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
            });
        this.hide();
    }
}
