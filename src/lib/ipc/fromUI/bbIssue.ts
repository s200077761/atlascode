import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { CommonAction } from './common';

export enum BitbucketIssueActionType {
    UpdateStatusRequest = 'updateStatusRequest',
    AddCommentRequest = 'addCommentRequest'
}

export type BitbucketIssueAction =
    | ReducerAction<BitbucketIssueActionType.UpdateStatusRequest, UpdateStatusRequestAction>
    | ReducerAction<BitbucketIssueActionType.AddCommentRequest, AddCommentRequestAction>
    | CommonAction;

export interface UpdateStatusRequestAction {
    status: string;
}

export interface AddCommentRequestAction {
    content: string;
}
