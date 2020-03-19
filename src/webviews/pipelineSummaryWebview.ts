import * as vscode from 'vscode';
import { DetailedSiteInfo, Product, ProductBitbucket } from '../atlclients/authInfo';
import { clientForSite } from '../bitbucket/bbUtils';
import { Commands } from '../commands';
import { Container } from '../container';
import { Action, onlineStatus } from '../ipc/messaging';
import { isCopyPipelineLinkAction } from '../ipc/pipelinesActions';
import { PipelineData, StepMessageData } from '../ipc/pipelinesMessaging';
import { Logger } from '../logger';
import { Pipeline, PipelineStep } from '../pipelines/model';
import { iconSet, Resources } from '../resources';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';

export class PipelineSummaryWebview extends AbstractReactWebview implements InitializingWebview<Pipeline> {
    private pipeline: Pipeline | undefined = undefined;
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return 'Bitbucket Pipeline';
    }

    public get id(): string {
        return 'pipelineSummaryScreen';
    }

    setIconPath() {
        this._panel!.iconPath = Resources.icons.get(iconSet.BITBUCKETICON);
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        return this.pipeline?.site.details;
    }

    public get productOrUndefined(): Product | undefined {
        return ProductBitbucket;
    }

    initialize(pipeline: Pipeline) {
        this.pipeline = pipeline;
        this.invalidate();
    }

    public async invalidate() {
        if (this.pipeline === undefined || this.pipeline.uuid === '') {
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

        const bbApi = await clientForSite(this.pipeline.site);
        try {
            let pipeline = await bbApi.pipelines!.getPipeline(this.pipeline.site, this.pipeline.uuid);
            this.updatePipeline(pipeline);
        } catch (e) {
            Logger.error(e);
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
            this.isRefeshing = false;
            return;
        }

        try {
            let steps = await bbApi.pipelines!.getSteps(this.pipeline.site, this.pipeline.uuid);
            this.updateSteps(steps);

            steps.map(step => {
                bbApi.pipelines!.getStepLog(this.pipeline!.site, this.pipeline!.uuid, step.uuid).then(logs => {
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
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
            return;
        } finally {
            this.isRefeshing = false;
        }
    }

    public async updatePipeline(pipeline: Pipeline) {
        if (this._panel) {
            this._panel.title = `Result for Pipeline ${pipeline.build_number}`;
        }
        const msg = pipeline as PipelineData;
        msg.type = 'updatePipeline';
        this.postMessage(msg);
    }

    public async updateSteps(steps: PipelineStep[]) {
        const msg = { steps: steps } as StepMessageData;
        msg.type = 'updateSteps';
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
                    }
                    break;
                }
                case 'rerun': {
                    handled = true;
                    const bbApi = await clientForSite(this.pipeline!.site);
                    try {
                        const newPipeline = await bbApi.pipelines!.triggerPipeline(
                            this.pipeline!.site,
                            this.pipeline!.target
                        );
                        vscode.commands.executeCommand(Commands.ShowPipeline, newPipeline);
                        this.hide();
                    } catch (e) {
                        Logger.error(e);
                        this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                    }
                    break;
                }
            }
        }
        return handled;
    }
}
