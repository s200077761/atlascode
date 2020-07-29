import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { ApprovalStatus, BitbucketSite, FileDiff, User } from '../../../bitbucket/model';
import { CommonAction } from './common';

export enum PullRequestDetailsActionType {
    FetchUsersRequest = 'fetchUsersRequest',
    UpdateSummaryRequest = 'updateSummaryRequest',
    UpdateTitleRequest = 'updateTitleRequest',
    UpdateReviewers = 'updateReviewers',
    UpdateApprovalStatus = 'updateApprovalStatus',
    CheckoutBranch = 'checkoutBranch',
    OpenDiffRequest = 'openDiffRequest',
}

export type PullRequestDetailsAction =
    | ReducerAction<PullRequestDetailsActionType.FetchUsersRequest, FetchUsersRequestAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateSummaryRequest, UpdateSummaryAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateTitleRequest, UpdateTitleAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateReviewers, UpdateReviewersAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateApprovalStatus, UpdateApprovalStatusAction>
    | ReducerAction<PullRequestDetailsActionType.CheckoutBranch>
    | ReducerAction<PullRequestDetailsActionType.OpenDiffRequest, OpenDiffAction>
    | CommonAction;

export interface FetchUsersRequestAction {
    site: BitbucketSite;
    query: string;
    abortKey?: string;
}

export interface UpdateSummaryAction {
    text: string;
}

export interface UpdateTitleAction {
    text: string;
}

export interface UpdateReviewersAction {
    reviewers: User[];
}

export interface UpdateApprovalStatusAction {
    status: ApprovalStatus;
}
export interface OpenDiffAction {
    fileDiff: FileDiff;
}
