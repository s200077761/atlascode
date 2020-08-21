import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import {
    ApprovalStatus,
    BitbucketIssue,
    BitbucketSite,
    Comment,
    FileDiff,
    MergeStrategy,
    User,
} from '../../../bitbucket/model';
import { CommonAction } from './common';

export enum PullRequestDetailsActionType {
    FetchUsersRequest = 'fetchUsersRequest',
    UpdateSummaryRequest = 'updateSummaryRequest',
    UpdateTitleRequest = 'updateTitleRequest',
    UpdateReviewers = 'updateReviewers',
    UpdateApprovalStatus = 'updateApprovalStatus',
    CheckoutBranch = 'checkoutBranch',
    PostComment = 'postComment',
    EditComment = 'editComment',
    DeleteComment = 'deleteComment',
    OpenDiffRequest = 'openDiffRequest',
    Merge = 'merge',
    OpenJiraIssue = 'openJiraIssue',
    OpenBitbucketIssue = 'openBitbucketIssue',
}

export type PullRequestDetailsAction =
    | ReducerAction<PullRequestDetailsActionType.FetchUsersRequest, FetchUsersRequestAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateSummaryRequest, UpdateSummaryAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateTitleRequest, UpdateTitleAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateReviewers, UpdateReviewersAction>
    | ReducerAction<PullRequestDetailsActionType.UpdateApprovalStatus, UpdateApprovalStatusAction>
    | ReducerAction<PullRequestDetailsActionType.PostComment, PostCommentAction>
    | ReducerAction<PullRequestDetailsActionType.EditComment, EditCommentAction>
    | ReducerAction<PullRequestDetailsActionType.DeleteComment, DeleteCommentAction>
    | ReducerAction<PullRequestDetailsActionType.CheckoutBranch>
    | ReducerAction<PullRequestDetailsActionType.OpenDiffRequest, OpenDiffAction>
    | ReducerAction<PullRequestDetailsActionType.Merge, MergeAction>
    | ReducerAction<PullRequestDetailsActionType.OpenJiraIssue, OpenJiraIssueAction>
    | ReducerAction<PullRequestDetailsActionType.OpenBitbucketIssue, OpenBitbucketIssueAction>
    | CommonAction;

export interface FetchUsersRequestAction {
    site: BitbucketSite;
    query: string;
    abortKey?: string;
}

export interface UpdateSummaryAction {
    text: string;
}

export interface UpdateTitleAction {
    text: string;
}

export interface UpdateReviewersAction {
    reviewers: User[];
}

export interface UpdateApprovalStatusAction {
    status: ApprovalStatus;
}

export interface PostCommentAction {
    rawText: string;
    parentId?: string;
}

export interface EditCommentAction {
    rawContent: string;
    commentId: string;
}

export interface DeleteCommentAction {
    comment: Comment;
}

export interface OpenDiffAction {
    fileDiff: FileDiff;
}

export interface MergeAction {
    mergeStrategy: MergeStrategy;
    commitMessage: string;
    closeSourceBranch: boolean;
    issues: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[];
}

export interface OpenJiraIssueAction {
    issue: MinimalIssue<DetailedSiteInfo>;
}

export interface OpenBitbucketIssueAction {
    issue: BitbucketIssue;
}
