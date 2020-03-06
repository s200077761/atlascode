import { commands, window } from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import { Commands } from '../../commands';
import { Logger } from '../../logger';
import { Pipeline } from '../../pipelines/model';

export async function rerunPipeline(pipeline: Pipeline) {
    const bbApi = await clientForSite(pipeline.site);
    try {
        await bbApi.pipelines!.triggerPipeline(pipeline.site, pipeline.target);

        // Seems like there's a bit of lag between a build starting and it showing up in the list API.
        setTimeout(() => {
            commands.executeCommand(Commands.RefreshPipelines);
        }, 500);
    } catch (e) {
        Logger.error(e);
        window.showErrorMessage(`Error rerunning build`);
    }
}
