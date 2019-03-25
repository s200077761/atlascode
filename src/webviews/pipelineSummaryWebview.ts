import { AbstractReactWebview, InitializingWebview } from "./abstractWebview";
import { Action, onlineStatus, HostErrorMessage } from '../ipc/messaging';
import { PipelineData, StepMessageData } from "../ipc/pipelinesMessaging";
import { PipelineApi } from "../pipelines/pipelines";
import { Pipeline, PipelineStep } from "../pipelines/model";
import { PipelineInfo } from "../views/pipelines/PipelinesTree";
import { Container } from "../container";
import { Logger } from "../logger";

type Emit = PipelineData | StepMessageData | HostErrorMessage;

export class PipelineSummaryWebview extends AbstractReactWebview<Emit, Action> implements InitializingWebview<PipelineInfo> {
    private _pipelineInfo: PipelineInfo | undefined = undefined;
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
        this._pipelineInfo = pipelineInfo;
        this.invalidate();
    }

    public async invalidate() {
        if (this._pipelineInfo === undefined || this._pipelineInfo.pipelineUuid === "") {
            return;
        }

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        try {
            let pipeline = await PipelineApi.getPipeline(this._pipelineInfo.repo, this._pipelineInfo.pipelineUuid);
            this.updatePipeline(pipeline);
        } catch (e) {
            Logger.error(e);
            this.postMessage({ type: 'error', reason: e });
            return;
        }

        try {
            let steps = await PipelineApi.getSteps(this._pipelineInfo.repo, this._pipelineInfo.pipelineUuid);
            this.updateSteps(steps);

            steps.map(step => {
                PipelineApi.getStepLog(this._pipelineInfo!.repo, this._pipelineInfo!.pipelineUuid, step.uuid).then((logs) => {
                    const commands = [...step.setup_commands, ...step.script_commands, ...step.teardown_commands];
                    logs.map((log, ix) => {
                        if (ix < commands.length) {
                            commands[ix].logs = log;
                            this.updateSteps(steps);
                        }
                    });
                });
            });
        } catch (e) {
            Logger.error(e);
            this.postMessage({ type: 'error', reason: e });
            return;
        }
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

        if (!handled) {
            switch (e.action) {
                case 'refresh': {
                    handled = true;
                    this.invalidate();
                    break;
                }
            }
        }
        return handled;
    }
}
