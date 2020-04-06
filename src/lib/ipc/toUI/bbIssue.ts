import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { BitbucketIssue, Comment, emptyBitbucketSite } from '../../../bitbucket/model';

export enum BitbucketIssueMessageType {
    Init = 'init',
    Comments = 'comments',
    UpdateStatusResponse = 'updateStatusResponse'
}

export type BitbucketIssueMessage =
    | ReducerAction<BitbucketIssueMessageType.Init, BitbucketIssueInitMessage>
    | ReducerAction<BitbucketIssueMessageType.Comments, BitbucketIssueCommentsMessage>;

export type BitbucketIssueResponse = ReducerAction<BitbucketIssueMessageType.UpdateStatusResponse>;

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
    changes: Partial<BitbucketIssue>;
}
