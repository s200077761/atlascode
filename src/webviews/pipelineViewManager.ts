import { PipelineSummaryWebview } from "./pipelineSummaryWebview";
import { AbstractMultiViewManager } from './multiViewManager';
import { PipelineInfo } from "../views/pipelines/PipelinesTree";

export class PipelineViewManager extends AbstractMultiViewManager<PipelineInfo> {
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    dataKey(pipeline: PipelineInfo): string {
        return (pipeline.pipelineUuid);
    }

    createView(extensionPath: string) {
        return new PipelineSummaryWebview(extensionPath);
    }
}