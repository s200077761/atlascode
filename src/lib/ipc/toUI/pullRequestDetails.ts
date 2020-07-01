import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

export enum PullRequestDetailsMessageType {
    Init = 'init',
    Update = 'configUpdate',
}

export type PullRequestDetailsMessage =
    | ReducerAction<PullRequestDetailsMessageType.Init, PullRequestDetailsInitMessage>
    | ReducerAction<PullRequestDetailsMessageType.Update, PullRequestDetailsInitMessage>;

export type PullRequestDetailsResponse = any;

export interface PullRequestDetailsInitMessage {}

export const emptyPullRequestDetailsInitMessage: PullRequestDetailsInitMessage = {};
