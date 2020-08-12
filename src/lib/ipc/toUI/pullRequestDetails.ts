import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import {
    ApprovalStatus,
    BitbucketIssue,
    BuildStatus,
    Commit,
    emptyPullRequest,
    emptyUser,
    FileDiff,
    MergeStrategy,
    PullRequest,
    Reviewer,
    User,
} from '../../../bitbucket/model';

export enum PullRequestDetailsMessageType {
    Init = 'init',
    Update = 'update',
    FetchUsersResponse = 'fetchUsersResponse',
    UpdateSummary = 'updateSummary',
    UpdateTitle = 'updateTitle',
    UpdateCommits = 'updateCommits',
    UpdateReviewers = 'updateReviewers',
    UpdateApprovalStatus = 'updateApprovalStatus',
    CheckoutBranch = 'checkoutBranch',
    UpdateFileDiffs = 'updateFileDiffs',
    UpdateBuildStatuses = 'updateBuildStatuses',
    UpdateMergeStrategies = 'updateMergeStrategies',
    UpdateRelatedJiraIssues = 'updateRelatedJiraIssues',
    UpdateRelatedBitbucketIssues = 'updateRelatedBitbucketIssues',
}

export type PullRequestDetailsMessage =
    | ReducerAction<PullRequestDetailsMessageType.Init, PullRequestDetailsInitMessage>
    | ReducerAction<PullRequestDetailsMessageType.Update, PullRequestDetailsInitMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateSummary, PullRequestDetailsSummaryMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateTitle, PullRequestDetailsTitleMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateCommits, PullRequestDetailsCommitsMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateReviewers, PullRequestDetailsReviewersMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateApprovalStatus, PullRequestDetailsApprovalMessage>
    | ReducerAction<PullRequestDetailsMessageType.CheckoutBranch, PullRequestDetailsCheckoutBranchMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateFileDiffs, PullRequestDetailsFileDiffsMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateBuildStatuses, PullRequestDetailsBuildStatusesMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateMergeStrategies, PullRequestDetailsMergeStrategiesMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateRelatedJiraIssues, PullRequestDetailsRelatedJiraIssuesMessage>
    | ReducerAction<
          PullRequestDetailsMessageType.UpdateRelatedBitbucketIssues,
          PullRequestDetailsRelatedBitbucketIssuesMessage
      >;
export type PullRequestDetailsResponse = ReducerAction<
    PullRequestDetailsMessageType.FetchUsersResponse,
    FetchUsersResponseMessage
>;

export interface PullRequestDetailsInitMessage {
    pr: PullRequest;
    commits: Commit[];
    currentUser: User;
    currentBranchName: string;
    fileDiffs: FileDiff[];
    mergeStrategies: MergeStrategy[];
    buildStatuses: BuildStatus[];
    relatedJiraIssues: MinimalIssue<DetailedSiteInfo>[];
    relatedBitbucketIssues: BitbucketIssue[];
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

export interface PullRequestDetailsFileDiffsMessage {
    fileDiffs: FileDiff[];
}

export interface PullRequestDetailsMergeStrategiesMessage {
    mergeStrategies: MergeStrategy[];
}

export interface PullRequestDetailsBuildStatusesMessage {
    buildStatuses: BuildStatus[];
}

export interface PullRequestDetailsRelatedJiraIssuesMessage {
    relatedIssues: MinimalIssue<DetailedSiteInfo>[];
}

export interface PullRequestDetailsRelatedBitbucketIssuesMessage {
    relatedIssues: BitbucketIssue[];
}

export const emptyPullRequestDetailsInitMessage: PullRequestDetailsInitMessage = {
    pr: emptyPullRequest,
    commits: [],
    currentUser: emptyUser,
    currentBranchName: '',
    fileDiffs: [],
    mergeStrategies: [],
    buildStatuses: [],
    relatedJiraIssues: [],
    relatedBitbucketIssues: [],
};
