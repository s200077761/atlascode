import { DetailedSiteInfo, emptySiteInfo, ProductBitbucket } from '../../../atlclients/authInfo';
import { BitbucketSite, Repo } from '../../../bitbucket/model';
import { Pipeline, PipelineState, PipelineTarget, PipelineTargetType } from '../../../pipelines/model';
import { PipelineSummaryInitMessage } from '../toUI/pipelineSummary';

export const emptyPipelineTarget: PipelineTarget = {
    type: PipelineTargetType.Reference,
};

export const emptyPipelineState: PipelineState = {
    name: '',
    type: '',
};

export const emptyBitbucketSiteInfo: DetailedSiteInfo = { ...emptySiteInfo, product: ProductBitbucket };

export const emptyBitbucketSite: BitbucketSite = {
    details: emptyBitbucketSiteInfo,
    ownerSlug: '',
    repoSlug: '',
};

export const emptyRepo: Repo = {
    id: '',
    name: '',
    displayName: '',
    fullName: '',
    url: '',
    avatarUrl: '',
    issueTrackerEnabled: false,
};

export const emptyPipeline: Pipeline = {
    repository: emptyRepo,
    site: emptyBitbucketSite,
    build_number: 0,
    created_on: '',
    state: emptyPipelineState,
    uuid: '',
    target: emptyPipelineTarget,
};

export const emptyPipelineSummaryInitMessage: PipelineSummaryInitMessage = {
    pipeline: emptyPipeline,
};
