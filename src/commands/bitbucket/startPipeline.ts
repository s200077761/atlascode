import { window, commands } from "vscode";
import { BranchNode } from "../../views/pipelines/PipelinesTree";
import { PipelineApi } from "../../pipelines/pipelines";
import { Logger } from "../../logger";
import { Commands } from "../../commands";
import { pipelineStartEvent } from "../../analytics";
import { Container } from "../../container";

export async function startPipeline(node: BranchNode) {
    PipelineApi.startPipeline(node.repo, node.branchName)
        .then(pipeline => {
            commands.executeCommand(Commands.RefreshPipelines);
            pipelineStartEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });
        })
        .catch(err => {
            Logger.error(new Error(`Error starting pipeline ${err}`));
            window.showErrorMessage("Failed to start pipeline.");
        });
}