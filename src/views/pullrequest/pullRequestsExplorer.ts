import { commands, ConfigurationChangeEvent } from 'vscode';
import { BitbucketContext } from '../../bitbucket/bbContext';
import { PullRequest } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { configuration } from '../../config/configuration';
import { CommandContext, PullRequestTreeViewId, setCommandContext } from '../../constants';
import { Container } from '../../container';
import { BitbucketExplorer } from '../BitbucketExplorer';
import { BaseTreeDataProvider } from '../Explorer';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { PullRequestCreatedMonitor } from './pullRequestCreatedMonitor';

export class PullRequestsExplorer extends BitbucketExplorer {
    constructor(ctx: BitbucketContext) {
        super(ctx);

        Container.context.subscriptions.push(
            commands.registerCommand(Commands.BitbucketRefreshPullRequests, () => this.refresh()),
            commands.registerCommand(Commands.BitbucketToggleFileNesting, () => this.toggleFileNesting()),
            commands.registerCommand(Commands.BitbucketShowPullRequestDetails, async (pr: PullRequest) => {
                //Uncomment this line to see the MUI version of the PR page
                //TODO: uncomment this and remove the other createOrShow when MUI page is done
                //await Container.pullRequestDetailsWebviewFactory.createOrShow(pr.data.url, pr);
                await Container.pullRequestViewManager.createOrShow(pr);
            }),
            commands.registerCommand(
                Commands.CreatePullRequest,
                Container.pullRequestCreatorView.createOrShow,
                Container.pullRequestCreatorView
            )
        );
    }

    viewId(): string {
        return PullRequestTreeViewId;
    }

    explorerEnabledConfiguration(): string {
        return 'bitbucket.explorer.enabled';
    }

    monitorEnabledConfiguration(): string {
        return 'bitbucket.explorer.notifications.pullRequestCreated';
    }

    refreshConfiguation(): string {
        return 'bitbucket.explorer.refreshInterval';
    }

    newTreeDataProvider(): BaseTreeDataProvider {
        return new PullRequestNodeDataProvider(this.ctx);
    }

    newMonitor(): BitbucketActivityMonitor {
        return new PullRequestCreatedMonitor(this.ctx);
    }

    onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'bitbucket.explorer.enabled')) {
            setCommandContext(CommandContext.BitbucketExplorer, Container.config.bitbucket.explorer.enabled);
        }
    }

    toggleFileNesting() {
        const isEnabled = configuration.get<boolean>('bitbucket.explorer.nestFilesEnabled');
        configuration.updateEffective('bitbucket.explorer.nestFilesEnabled', !isEnabled, null);
        this.refresh();
    }
}
