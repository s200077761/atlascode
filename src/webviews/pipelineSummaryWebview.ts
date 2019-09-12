import * as vscode from 'vscode';
import { AbstractReactWebview, InitializingWebview } from "./abstractWebview";
import { Action, onlineStatus } from '../ipc/messaging';
import { PipelineData, StepMessageData } from "../ipc/pipelinesMessaging";
import { Pipeline, PipelineStep } from "../pipelines/model";
import { PipelineInfo } from "../views/pipelines/PipelinesTree";
import { Container } from "../container";
import { Logger } from "../logger";
import { isCopyPipelineLinkAction } from '../ipc/pipelinesActions';
import { clientForRemote, siteDetailsForRemote } from '../bitbucket/bbUtils';
import { DetailedSiteInfo } from '../atlclients/authInfo';

export class PipelineSummaryWebview extends AbstractReactWebview implements InitializingWebview<PipelineInfo> {
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

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        if (this._pipelineInfo) {
            return siteDetailsForRemote(this._pipelineInfo.remote);
        }

        return undefined;
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

        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;

        const bbApi = await clientForRemote(this._pipelineInfo.remote);
        try {
            let pipeline = await bbApi.pipelines!.getPipeline(this._pipelineInfo.repo, this._pipelineInfo.pipelineUuid);
            this.updatePipeline(pipeline);
        } catch (e) {
            Logger.error(e);
            this.postMessage({ type: 'error', reason: e });
            this.isRefeshing = false;
            return;
        }

        try {
            let steps = await bbApi.pipelines!.getSteps(this._pipelineInfo.repo, this._pipelineInfo.pipelineUuid);
            this.updateSteps(steps);

            steps.map(step => {
                bbApi.pipelines!.getStepLog(this._pipelineInfo!.repo, this._pipelineInfo!.pipelineUuid, step.uuid).then((logs) => {
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
        } finally {
            this.isRefeshing = false;
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
                case 'copyPipelineLink': {
                    handled = true;
                    if (isCopyPipelineLinkAction(e)) {
                        await vscode.env.clipboard.writeText(e.href!);
                        vscode.window.showInformationMessage(`Copied pipeline link to clipboard - ${e.href}`);
                    }
                    break;
                }
            }
        }
        return handled;
    }
}
