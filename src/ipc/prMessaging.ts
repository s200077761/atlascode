import { Message } from "./messaging";
import { Issue } from "../jira/jiraModel";
import { Branch, Remote } from "../typings/git";
import { User, Reviewer, Comment, Commit, BitbucketIssue, BitbucketBranchingModel } from "../bitbucket/model";

// PRData is the message that gets sent to the PullRequestPage react view containing the PR details.
export interface PRData extends Message {
    pr?: Bitbucket.Schema.Pullrequest;
    currentUser?: User;
    currentBranch: string;
    commits?: Commit[];
    comments?: Comment[];
    relatedJiraIssues?: Issue[];
    relatedBitbucketIssues?: BitbucketIssue[];
    mainIssue?: Issue | BitbucketIssue;
    buildStatuses?: Bitbucket.Schema.Commitstatus[];
    errors?: string;
}

export function isPRData(a: Message): a is PRData {
    return (<PRData>a).type === 'update';
}

export interface RepoData {
    uri: string;
    href?: string;
    avatarUrl?: string;
    name?: string;
    owner?: string;
    remotes: Remote[];
    defaultReviewers: Reviewer[];
    localBranches: Branch[];
    remoteBranches: Branch[];
    developmentBranch?: string;
    hasLocalChanges?: boolean;
    branchingModel?: BitbucketBranchingModel;
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
    issue?: Issue | BitbucketIssue;
}

export function isCommitsResult(a: Message): a is CommitsResult {
    return (<CommitsResult>a).type === 'commitsResult';
}
