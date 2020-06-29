import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from '../atlclients/authInfo';
import {
    BitbucketBranchingModel,
    BitbucketIssue,
    BuildStatus,
    Comment,
    Commit,
    FileDiff,
    MergeStrategy,
    PullRequest,
    Reviewer,
    Task,
    User,
    WorkspaceRepo,
} from '../bitbucket/model';
import { Branch } from '../typings/git';
import { Message } from './messaging';

// PRData is the message that gets sent to the PullRequestPage react view containing the PR details.
export interface PRData extends Message {
    pr?: PullRequest;
    fileDiffs?: FileDiff[];
    currentUser?: User;
    currentBranch: string;
    relatedJiraIssues?: MinimalIssue<DetailedSiteInfo>[];
    relatedBitbucketIssues?: BitbucketIssue[];
    mainIssue?: MinimalIssue<DetailedSiteInfo> | BitbucketIssue;
    buildStatuses?: BuildStatus[];
    mergeStrategies: MergeStrategy[];
}

export function isPRData(a: Message): a is PRData {
    return (<PRData>a).type === 'update';
}

export interface UpdateDiff extends Message {
    fileDiffs: FileDiff[];
}

export function isUpdateDiff(a: Message): a is UpdateDiff {
    return (<UpdateDiff>a).type === 'updateDiffs';
}

export interface UpdateComments extends Message {
    comments: Comment[];
}

export function isUpdateComments(a: Message): a is UpdateComments {
    return (<UpdateComments>a).type === 'updateComments';
}

export interface UpdateTasks extends Message {
    tasks: Task[];
}

export function isUpdateTasks(a: Message): a is UpdateTasks {
    return (<UpdateTasks>a).type === 'updateTasks';
}

export interface UpdateCommits extends Message {
    commits: Commit[];
}

export function isUpdateCommits(a: Message): a is UpdateCommits {
    return (<UpdateCommits>a).type === 'updateCommits';
}

export interface UpdateRelatedJiraIssues extends Message {
    relatedJiraIssues: MinimalIssue<DetailedSiteInfo>[];
}

export function isUpdateRelatedJiraIssues(a: Message): a is UpdateRelatedJiraIssues {
    return (<UpdateRelatedJiraIssues>a).type === 'updateRelatedJiraIssues';
}

export interface UpdateRelatedBitbucketIssues extends Message {
    relatedBitbucketIssues: BitbucketIssue[];
}

export function isUpdateRelatedBitbucketIssues(a: Message): a is UpdateRelatedBitbucketIssues {
    return (<UpdateRelatedBitbucketIssues>a).type === 'updateRelatedBitbucketIssues';
}

export interface BranchType {
    kind: string;
    prefix: string;
}

export interface RepoData {
    workspaceRepo: WorkspaceRepo;
    href?: string;
    avatarUrl?: string;
    localBranches: Branch[];
    remoteBranches: Branch[];
    branchTypes: BranchType[];
    developmentBranch?: string;
    hasLocalChanges?: boolean;
    branchingModel?: BitbucketBranchingModel;
    isCloud: boolean;
}

export interface CheckoutResult extends Message {
    currentBranch: string;
}

export interface CommitsResult extends Message {
    type: 'commitsResult';
    error?: string;
    commits: Commit[];
}

export interface FetchIssueResult extends Message {
    type: 'fetchIssueResult';
    issue?: MinimalIssue<DetailedSiteInfo> | BitbucketIssue;
}

export interface FetchUsersResult extends Message {
    type: 'fetchUsersResult';
    users: Reviewer[];
}

export function isCommitsResult(a: Message): a is CommitsResult {
    return (<CommitsResult>a).type === 'commitsResult';
}

export interface DiffResult extends Message {
    type: 'diffResult';
    fileDiffs: FileDiff[];
}

export function isDiffResult(a: Message): a is DiffResult {
    return (<DiffResult>a).type === 'diffResult';
}
