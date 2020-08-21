import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import {
    ApprovalStatus,
    BitbucketIssue,
    BuildStatus,
    Comment,
    Commit,
    emptyPullRequest,
    emptyUser,
    FileDiff,
    MergeStrategy,
    PullRequest,
    Reviewer,
    Task,
    User,
} from '../../../bitbucket/model';

export enum PullRequestDetailsMessageType {
    Init = 'init',
    Update = 'update',
    FetchUsersResponse = 'fetchUsersResponse',
    PostCommentResponse = 'postCommentResponse',
    AddTaskResponse = 'addTaskResponse',
    EditTaskResponse = 'editTaskResponse',
    DeleteTaskResponse = 'deleteTaskResponse',
    UpdateSummary = 'updateSummary',
    UpdateTitle = 'updateTitle',
    UpdateCommits = 'updateCommits',
    UpdateReviewers = 'updateReviewers',
    UpdateApprovalStatus = 'updateApprovalStatus',
    CheckoutBranch = 'checkoutBranch',
    UpdateComments = 'updateComments',
    UpdateFileDiffs = 'updateFileDiffs',
    UpdateBuildStatuses = 'updateBuildStatuses',
    UpdateMergeStrategies = 'updateMergeStrategies',
    UpdateRelatedJiraIssues = 'updateRelatedJiraIssues',
    UpdateRelatedBitbucketIssues = 'updateRelatedBitbucketIssues',
    UpdateTasks = 'updateTasks',
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
    | ReducerAction<PullRequestDetailsMessageType.UpdateComments, PullRequestDetailsCommentsMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateFileDiffs, PullRequestDetailsFileDiffsMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateBuildStatuses, PullRequestDetailsBuildStatusesMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateMergeStrategies, PullRequestDetailsMergeStrategiesMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateRelatedJiraIssues, PullRequestDetailsRelatedJiraIssuesMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateTasks, PullRequestDetailsTasksMessage>
    | ReducerAction<
          PullRequestDetailsMessageType.UpdateRelatedBitbucketIssues,
          PullRequestDetailsRelatedBitbucketIssuesMessage
      >;
export type PullRequestDetailsResponse =
    | ReducerAction<PullRequestDetailsMessageType.FetchUsersResponse, FetchUsersResponseMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateFileDiffs, PullRequestDetailsFileDiffsMessage>
    | ReducerAction<PullRequestDetailsMessageType.PostCommentResponse, VoidResponseMessage>
    | ReducerAction<PullRequestDetailsMessageType.AddTaskResponse, VoidResponseMessage>
    | ReducerAction<PullRequestDetailsMessageType.EditTaskResponse, VoidResponseMessage>
    | ReducerAction<PullRequestDetailsMessageType.DeleteTaskResponse, VoidResponseMessage>;

export interface PullRequestDetailsInitMessage {
    pr: PullRequest;
    commits: Commit[];
    currentUser: User;
    currentBranchName: string;
    comments: Comment[];
    tasks: Task[];
    fileDiffs: FileDiff[];
    mergeStrategies: MergeStrategy[];
    buildStatuses: BuildStatus[];
    relatedJiraIssues: MinimalIssue<DetailedSiteInfo>[];
    relatedBitbucketIssues: BitbucketIssue[];
}

export interface FetchUsersResponseMessage {
    users: User[];
}

export interface VoidResponseMessage {}

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

export interface PullRequestDetailsCommentsMessage {
    comments: Comment[];
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

export interface PullRequestDetailsTasksMessage {
    tasks: Task[];
    comments: Comment[];
}

export const emptyPullRequestDetailsInitMessage: PullRequestDetailsInitMessage = {
    pr: emptyPullRequest,
    commits: [],
    currentUser: emptyUser,
    currentBranchName: '',
    comments: [],
    fileDiffs: [],
    mergeStrategies: [],
    buildStatuses: [],
    relatedJiraIssues: [],
    relatedBitbucketIssues: [],
    tasks: [],
};
