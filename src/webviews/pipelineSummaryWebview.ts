import { AbstractReactWebview, InitializingWebview } from "./abstractWebview";
import { Action } from '../ipc/messaging';
import { PipelineData, StepMessageData } from "../ipc/pipelinesMessaging";
import { PipelineApi } from "../pipelines/pipelines";
import { Pipeline, PipelineStep } from "../pipelines/model";
import { PipelineInfo } from "../views/pipelines/PipelinesTree";

type Emit = PipelineData | StepMessageData;

export class PipelineSummaryWebview extends AbstractReactWebview<Emit, Action> implements InitializingWebview<PipelineInfo> {
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Bitbucket Pipeline";
    }

    public get id(): string {
        return "pipelineSummaryScreen";

    }

    initialize(pipelineInfo: PipelineInfo) {
        PipelineApi.getPipeline(pipelineInfo.repo, pipelineInfo.pipelineUuid)
            .then(pipeline => {
                this.updatePipeline(pipeline);
            });
        PipelineApi.getSteps(pipelineInfo.repo, pipelineInfo.pipelineUuid)
            .then(steps => {
                this.updateSteps(steps);
                steps.map(step => {
                    PipelineApi.getStepLog(pipelineInfo.repo, pipelineInfo.pipelineUuid, step.uuid).then((logs) => {
                        const commands = [...step.setup_commands, ...step.script_commands, ...step.teardown_commands];
                        logs.map((log, ix) => {
                            if (ix < commands.length) {
                                commands[ix].logs = log;
                                this.updateSteps(steps);
                            }
                        });
                    });
                });
            });
    }

    public invalidate() {

    }

    public async updatePipeline(pipeline: Pipeline) {
        if (this._panel) { this._panel.title = `Result for Pipeline ${pipeline.build_number}`; }
        const msg = pipeline as PipelineData;
        msg.type = "updatePipeline";
        this.postMessage(msg);
    }

    public async updateSteps(steps: PipelineStep[]) {
        const msg = { steps: steps } as StepMessageData;
        msg.type = "updateSteps";
        this.postMessage(msg);
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);
        return handled;
    }
}