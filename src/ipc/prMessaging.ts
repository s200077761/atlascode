import { Message } from "./messaging";
import { Issue } from "../jira/jiraModel";
import { Branch, Remote } from "../typings/git";

// PRData is the message that gets sent to the PullRequestPage react view containing the PR details.
export interface PRData extends Message {
    pr?: Bitbucket.Schema.Pullrequest;
    currentUser?: Bitbucket.Schema.User;
    currentBranch: string;
    commits?: Bitbucket.Schema.Commit[];
    comments?: Bitbucket.Schema.Comment[];
    relatedJiraIssues?: Issue[];
    buildStatuses?: Bitbucket.Schema.Commitstatus[];
    errors?: string;
}

export function isPRData(a: Message): a is PRData {
    return (<PRData>a).type === 'update';
}

export interface RepoData {
    uri: string;
    href?: string;
    remotes: Remote[];
    localBranches: Branch[];
    remoteBranches: Branch[];
    mainbranch?: string;
}

export interface CreatePRData extends Message {
    repositories: RepoData[];
}

export function isCreatePRData(a: Message): a is CreatePRData {
    return (<CreatePRData>a).type === 'createPullRequestData';
}

export interface CheckoutResult extends Message {
    error?: string;
    currentBranch: string;
}

export function isCheckoutError(a: Message): a is CheckoutResult {
    return (<CheckoutResult>a).type === 'checkout';
}

export interface CommitsResult extends Message {
    type: 'commitsResult';
    error?: string;
    commits: Bitbucket.Schema.Commit[];
}

export function isCommitsResult(a: Message): a is CommitsResult {
    return (<CommitsResult>a).type === 'commitsResult';
}

export interface CreatePullRequestResult extends Message {
    error?: string;
    url: string;
}

export function isCreatePullRequestResult(a: Message): a is CreatePullRequestResult {
    return (<CreatePullRequestResult>a).type === 'createPullRequestResult';
}
