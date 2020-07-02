import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { CommonAction } from './common';

export enum PullRequestDetailsActionType {
    FetchUsersRequest = 'fetchUsersRequest',
    UpdateSummary = 'updateSummary',
    UpdateTitle = 'updateTitle',
}

export type PullRequestDetailsAction =
    | ReducerAction<PullRequestDetailsActionType.FetchUsersRequest, FetchUsersRequestAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateSummary, UpdateSummaryAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateTitle, UpdateTitleAction>
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
