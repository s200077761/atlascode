import { MinimalIssue } from "jira-pi-client";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { BitbucketBranchingModel, BitbucketIssue, BuildStatus, Comment, Commit, FileDiff, MergeStrategy, PullRequestData, Reviewer, User } from "../bitbucket/model";
import { Branch, Remote } from "../typings/git";
import { Message } from "./messaging";


// PRData is the message that gets sent to the PullRequestPage react view containing the PR details.
export interface PRData extends Message {
    pr?: PullRequestData;
    fileDiffs?: FileDiff[];
    repoUri: string;
    remote: Remote;
    currentUser?: User;
    currentBranch: string;
    commits?: Commit[];
    comments?: Comment[];
    relatedJiraIssues?: MinimalIssue<DetailedSiteInfo>[];
    relatedBitbucketIssues?: BitbucketIssue[];
    mainIssue?: MinimalIssue<DetailedSiteInfo> | BitbucketIssue;
    buildStatuses?: BuildStatus[];
    mergeStrategies: MergeStrategy[];
}

export function isPRData(a: Message): a is PRData {
    return (<PRData>a).type === 'update';
}

export interface BranchType {
    kind: string;
    prefix: string;
}

export interface RepoData {
    uri: string;
    href?: string;
    avatarUrl?: string;
    name?: string;
    owner?: string;
    remotes: Remote[];
    defaultReviewers: User[];
    localBranches: Branch[];
    remoteBranches: Branch[];
    branchTypes: BranchType[];
    developmentBranch?: string;
    hasLocalChanges?: boolean;
    branchingModel?: BitbucketBranchingModel;
    isCloud: boolean;
}

export interface CreatePRData extends Message {
    repositories: RepoData[];
}

export function isCreatePRData(a: Message): a is CreatePRData {
    return (<CreatePRData>a).type === 'createPullRequestData';
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