import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import {
    BitbucketIssue,
    BitbucketIssueData,
    Comment,
    emptyBitbucketSite,
    emptyUser,
    User
} from '../../../bitbucket/model';

export enum BitbucketIssueMessageType {
    Init = 'init',
    InitComments = 'initComments',
    UpdateComments = 'updateComments',
    UpdateStatusResponse = 'updateStatusResponse',
    AddCommentResponse = 'addCommentResponse'
}

export type BitbucketIssueMessage =
    | ReducerAction<BitbucketIssueMessageType.Init, BitbucketIssueInitMessage>
    | ReducerAction<BitbucketIssueMessageType.InitComments, BitbucketIssueCommentsMessage>
    | ReducerAction<BitbucketIssueMessageType.UpdateComments, BitbucketIssueCommentsMessage>;

export type BitbucketIssueResponse =
    | ReducerAction<BitbucketIssueMessageType.UpdateStatusResponse, UpdateStatusResponseMessage>
    | ReducerAction<BitbucketIssueMessageType.AddCommentResponse, AddCommentResponseMessage>;

export interface BitbucketIssueInitMessage {
    issue: BitbucketIssue;
    currentUser: User;
}

export const emptyBitbucketIssueInitMessage: BitbucketIssueInitMessage = {
    issue: { site: emptyBitbucketSite, data: { id: '', state: '', content: { html: '' } } },
    currentUser: emptyUser
};

export interface BitbucketIssueCommentsMessage {
    comments: Comment[];
}

export const emptyBitbucketIssueCommentsMessage: BitbucketIssueCommentsMessage = {
    comments: []
};

export interface BitbucketIssueChangesMessage {
    issue: Partial<BitbucketIssueData>;
    comments: Comment[];
}

export interface UpdateStatusResponseMessage {
    status: string;
}

export interface AddCommentResponseMessage {
    comment: Comment;
}
