import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { CommonAction } from './common';

export enum BitbucketIssueActionType {
    UpdateStatusRequest = 'updateStatusRequest'
}

export type BitbucketIssueAction =
    | ReducerAction<BitbucketIssueActionType.UpdateStatusRequest, UpdateStatusRequestAction>
    | CommonAction;

export interface UpdateStatusRequestAction {
    status: string;
}
