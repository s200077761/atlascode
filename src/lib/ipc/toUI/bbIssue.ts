import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { BitbucketIssue, Comment, emptyBitbucketSite } from '../../../bitbucket/model';

export enum BitbucketIssueMessageType {
    Init = 'init',
    InitComments = 'initComments',
    UpdateComments = 'updateComments',
    UpdateStatusResponse = 'updateStatusResponse'
}

export type BitbucketIssueMessage =
    | ReducerAction<BitbucketIssueMessageType.Init, BitbucketIssueInitMessage>
    | ReducerAction<BitbucketIssueMessageType.InitComments, BitbucketIssueCommentsMessage>
    | ReducerAction<BitbucketIssueMessageType.UpdateComments, BitbucketIssueCommentsMessage>;

export type BitbucketIssueResponse = ReducerAction<
    BitbucketIssueMessageType.UpdateStatusResponse,
    UpdateStatusResponseMessage
>;

export interface BitbucketIssueInitMessage {
    issue: BitbucketIssue;
}

export const emptyBitbucketIssueInitMessage: BitbucketIssueInitMessage = {
    issue: { site: emptyBitbucketSite, data: { id: '', state: '', content: { html: '' } } }
};

export interface BitbucketIssueCommentsMessage {
    comments: Comment[];
}

export const emptyBitbucketIssueCommentsMessage: BitbucketIssueCommentsMessage = {
    comments: []
};

export interface BitbucketIssueChangesMessage {
    state: string;
    [k: string]: any;
}

export interface UpdateStatusResponseMessage {
    status: string;
}
