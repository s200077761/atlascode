import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

export enum BitbucketIssueMessageType {
    Init = 'init'
}

export type BitbucketIssueMessage = ReducerAction<BitbucketIssueMessageType.Init, BitbucketIssueInitMessage>;

export interface BitbucketIssueInitMessage {}

export const emptyBitbucketIssueInitMessage: BitbucketIssueInitMessage = {};
