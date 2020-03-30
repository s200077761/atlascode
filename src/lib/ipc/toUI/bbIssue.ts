import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { BitbucketIssue, emptyBitbucketSite } from '../../../bitbucket/model';

export enum BitbucketIssueMessageType {
    Init = 'init'
}

export type BitbucketIssueMessage = ReducerAction<BitbucketIssueMessageType.Init, BitbucketIssueInitMessage>;

export interface BitbucketIssueInitMessage {
    issue: BitbucketIssue;
}

export const emptyBitbucketIssueInitMessage: BitbucketIssueInitMessage = {
    issue: { site: emptyBitbucketSite, data: { id: '' } }
};
