import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { PipelineLogReference } from '../../../pipelines/model';
import { CommonAction } from './common';

export enum PipelineSummaryActionType {
    FetchLogRangeRequest = 'fetchLogRangeRequest',
    ReRunPipeline = 'reRunPipeline'
}

export type PipelineSummaryAction =
    | ReducerAction<PipelineSummaryActionType.FetchLogRangeRequest, ViewLogsRequestAction>
    | ReducerAction<PipelineSummaryActionType.ReRunPipeline, ReRunPipelineRequestAction>
    | CommonAction;

export interface ViewLogsRequestAction {
    uuid: string;
    reference: PipelineLogReference;
}

export interface ReRunPipelineRequestAction {}
