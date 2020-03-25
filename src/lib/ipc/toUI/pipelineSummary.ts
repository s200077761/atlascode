import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { DetailedSiteInfo, ProductBitbucket } from '../../../atlclients/authInfo';
import { BitbucketSite, Repo } from '../../../bitbucket/model';
import { Pipeline, PipelineState, PipelineStep, PipelineTarget, PipelineTargetType } from '../../../pipelines/model';

export enum PipelineSummaryMessageType {
    Update = 'pipelineUpdate',
    StepsUpdate = 'stepsUpdate'
}

export type PipelineSummaryMessage =
    | ReducerAction<PipelineSummaryMessageType.Update, PipelineSummaryUpdateMessage>
    | ReducerAction<PipelineSummaryMessageType.StepsUpdate, PipelineSummaryStepsUpdateMessage>;

export type PipelineSummaryResponse = {};

export interface PipelineSummaryInitMessage {
    pipeline: Pipeline;
}

export interface PipelineSummaryUpdateMessage {
    pipeline: Pipeline;
}

export interface PipelineSummaryStepsUpdateMessage {
    steps: PipelineStep[];
}

export interface PipelineSummaryLogUpdateMessage {
    logs: string;
}

export const emptyPipelineTarget: PipelineTarget = {
    type: PipelineTargetType.Reference
};

export const emptyPipelineState: PipelineState = {
    name: '',
    type: ''
};

export const emptyDetailedSiteInfo: DetailedSiteInfo = {
    host: '',
    product: ProductBitbucket,
    id: '',
    name: '',
    avatarUrl: '',
    baseLinkUrl: '',
    baseApiUrl: '',
    isCloud: true,
    userId: '',
    credentialId: ''
};

export const emptyBitbucketSite: BitbucketSite = {
    details: emptyDetailedSiteInfo,
    ownerSlug: '',
    repoSlug: ''
};

export const emptyRepo: Repo = {
    id: '',
    name: '',
    displayName: '',
    fullName: '',
    url: '',
    avatarUrl: '',
    issueTrackerEnabled: false
};

export const emptyPipeline: Pipeline = {
    repository: emptyRepo,
    site: emptyBitbucketSite,
    build_number: 0,
    created_on: '',
    state: emptyPipelineState,
    uuid: '',
    target: emptyPipelineTarget
};

export const emptyPipelineSummaryInitMessage: PipelineSummaryInitMessage = {
    pipeline: emptyPipeline
};
