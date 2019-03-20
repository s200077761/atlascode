import { AbstractReactWebview, InitializingWebview } from "./abstractWebview";
import { Action, onlineStatus, HostErrorMessage } from '../ipc/messaging';
import { PipelineData, StepMessageData } from "../ipc/pipelinesMessaging";
import { PipelineApi } from "../pipelines/pipelines";
import { Pipeline, PipelineStep } from "../pipelines/model";
import { Container } from "../container";
import { Logger } from "../logger";

type Emit = PipelineData | StepMessageData | HostErrorMessage;

export class PipelineSummaryWebview extends AbstractReactWebview<Emit, Action> implements InitializingWebview<string> {
    private _pipelineId: string = "";

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Bitbucket Pipeline";
    }

    public get id(): string {
        return "pipelineSummaryScreen";

    }

    async initialize(data: string) {
        this._pipelineId = data;
        this.invalidate();
    }

    public async invalidate() {
        if (this._pipelineId === "") {
            return;
        }

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        const repos = Container.bitbucketContext.getBitbucketRepositores();

        try {
            let pipeline = await PipelineApi.getPipeline(repos[0], this._pipelineId);
            this.updatePipeline(pipeline);
        } catch (e) {
            Logger.error(e);
            this.postMessage({ type: 'error', reason: e });
            return;
        }

        try {
            let steps = await PipelineApi.getSteps(repos[0], this._pipelineId);
            this.updateSteps(steps);
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