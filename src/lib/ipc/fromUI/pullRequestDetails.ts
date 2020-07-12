import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { CommonAction } from './common';

export enum PullRequestDetailsActionType {
    FetchUsersRequest = 'fetchUsersRequest',
    UpdateSummaryRequest = 'updateSummaryRequest',
    UpdateTitleRequest = 'updateTitleRequest',
}

export type PullRequestDetailsAction =
    | ReducerAction<PullRequestDetailsActionType.FetchUsersRequest, FetchUsersRequestAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateSummaryRequest, UpdateSummaryAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateTitleRequest, UpdateTitleAction>
    | CommonAction;

export interface FetchUsersRequestAction {
    query: string;
    abortKey?: string;
}

export interface UpdateSummaryAction {
    text: string;
}

export interface UpdateTitleAction {
    text: string;
}
