import { PipelineSummaryWebview } from "./pipelineSummaryWebview";
import { AbstractMultiViewManager } from './multiViewManager';

export class PipelineViewManager extends AbstractMultiViewManager<string> {
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    dataKey(data: string): string {
        return (data);
    }

    createView(extensionPath: string) {
        return new PipelineSummaryWebview(extensionPath);
    }
}