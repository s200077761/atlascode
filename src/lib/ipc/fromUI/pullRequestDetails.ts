import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { ApprovalStatus, BitbucketSite, User } from '../../../bitbucket/model';
import { CommonAction } from './common';

export enum PullRequestDetailsActionType {
    FetchUsersRequest = 'fetchUsersRequest',
    UpdateSummaryRequest = 'updateSummaryRequest',
    UpdateTitleRequest = 'updateTitleRequest',
    UpdateReviewers = 'updateReviewers',
    UpdateApprovalStatus = 'updateApprovalStatus',
}

export type PullRequestDetailsAction =
    | ReducerAction<PullRequestDetailsActionType.FetchUsersRequest, FetchUsersRequestAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateSummaryRequest, UpdateSummaryAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateTitleRequest, UpdateTitleAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateReviewers, UpdateReviewersAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateApprovalStatus, UpdateApprovalStatusAction>
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
