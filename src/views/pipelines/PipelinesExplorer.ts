import { ConfigurationChangeEvent, commands } from "vscode";
import { Container } from "../../container";
import { configuration } from "../../config/configuration";
import { PipelinesTree } from "./PipelinesTree";
import { setCommandContext, CommandContext, PipelinesTreeViewId } from "../../constants";
import { BitbucketContext } from "../../bitbucket/bbContext";
import { PipelinesMonitor } from "./PipelinesMonitor";
import { Commands } from "../../commands";
import { BitbucketExplorer, Tree } from "../BitbucketExplorer";

export class PipelinesExplorer extends BitbucketExplorer {

    constructor(ctx: BitbucketContext) {
        super(ctx);

        Container.context.subscriptions.push(
            commands.registerCommand(Commands.RefreshPipelines, this.refresh, this)
        );
    }

    viewId(): string {
        return PipelinesTreeViewId;
    }

    explorerEnabledConfiguration(): string {
        return 'bitbucket.pipelines.explorerEnabled';
    }

    monitorEnabledConfiguration(): string {
        return 'bitbucket.pipelines.monitorEnabled';
    }

    refreshConfiguation(): string {
        return 'bitbucket.pipelines.refreshInterval';
    }

    newTreeDataProvider(): Tree {
        return new PipelinesTree();
    }

    newMonitor(): BitbucketActivityMonitor {
        const repos = this.ctx.getBitbucketRepositores();
        return new PipelinesMonitor(repos);
    }

    async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'bitbucket.pipelines.explorerEnabled')) {
            setCommandContext(CommandContext.PipelineExplorer, Container.config.bitbucket.pipelines.explorerEnabled);
        }
    }
}
