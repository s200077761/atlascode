import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { CommonAction } from './common';
import { BitbucketSite } from '../../../bitbucket/model';

export enum CreateBitbucketIssueActionType {
    SubmitCreateRequest = 'submitCreateRequest',
}

export type CreateBitbucketIssueAction =
    | ReducerAction<CreateBitbucketIssueActionType.SubmitCreateRequest, SubmitCreateRequestAction>
    | CommonAction;

export interface SubmitCreateRequestAction {
    site: BitbucketSite;
    title: string;
    description: string;
    kind: string;
    priority: string;
}
