import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { CommonAction } from './common';

export enum BitbucketIssueActionType {
    UpdateStatus = 'updateStatus'
}

export type BitbucketIssueAction =
    | ReducerAction<BitbucketIssueActionType.UpdateStatus, UpdateStatusAction>
    | CommonAction;

export interface UpdateStatusAction {
    status: string;
}
