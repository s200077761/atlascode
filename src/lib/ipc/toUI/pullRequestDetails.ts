import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import {
    ApprovalStatus,
    Commit,
    emptyPullRequest,
    emptyUser,
    PullRequest,
    Reviewer,
    User,
} from '../../../bitbucket/model';

export enum PullRequestDetailsMessageType {
    Init = 'init',
    Update = 'configUpdate',
    FetchUsersResponse = 'fetchUsersResponse',
    UpdateSummary = 'updateSummary',
    UpdateTitle = 'updateTitle',
    UpdateCommits = 'updateCommits',
    UpdateReviewers = 'updateReviewers',
    UpdateApprovalStatus = 'updateApprovalStatus',
    CheckoutBranch = 'checkoutBranch',
}

export type PullRequestDetailsMessage =
    | ReducerAction<PullRequestDetailsMessageType.Init, PullRequestDetailsInitMessage>
    | ReducerAction<PullRequestDetailsMessageType.Update, PullRequestDetailsInitMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateSummary, PullRequestDetailsSummaryMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateTitle, PullRequestDetailsTitleMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateCommits, PullRequestDetailsCommitsMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateReviewers, PullRequestDetailsReviewersMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateApprovalStatus, PullRequestDetailsApprovalMessage>
    | ReducerAction<PullRequestDetailsMessageType.CheckoutBranch, PullRequestDetailsCheckoutBranchMessage>;

export type PullRequestDetailsResponse = ReducerAction<
    PullRequestDetailsMessageType.FetchUsersResponse,
    FetchUsersResponseMessage
>;

export interface PullRequestDetailsInitMessage {
    pr: PullRequest;
    commits: Commit[];
    currentUser: User;
    currentBranchName: string;
}

export interface FetchUsersResponseMessage {
    users: User[];
}

export interface PullRequestDetailsSummaryMessage {
    htmlSummary: string;
    rawSummary: string;
}

export interface PullRequestDetailsTitleMessage {
    title: string;
}

export interface PullRequestDetailsCommitsMessage {
    commits: Commit[];
}

export interface PullRequestDetailsReviewersMessage {
    reviewers: Reviewer[];
}

export interface PullRequestDetailsApprovalMessage {
    status: ApprovalStatus;
}

export interface PullRequestDetailsCheckoutBranchMessage {
    branchName: string;
}
export const emptyPullRequestDetailsInitMessage: PullRequestDetailsInitMessage = {
    pr: emptyPullRequest,
    commits: [],
    currentUser: emptyUser,
    currentBranchName: '',
};
