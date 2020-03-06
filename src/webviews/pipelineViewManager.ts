import { Pipeline } from '../pipelines/model';
import { AbstractMultiViewManager } from './multiViewManager';
import { PipelineSummaryWebview } from './pipelineSummaryWebview';

export class PipelineViewManager extends AbstractMultiViewManager<Pipeline> {
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    dataKey(pipeline: Pipeline): string {
        return pipeline.uuid;
    }

    createView(extensionPath: string) {
        return new PipelineSummaryWebview(extensionPath);
    }
}
