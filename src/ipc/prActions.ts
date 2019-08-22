import { Action } from "./messaging";
import { Branch, Remote } from "../typings/git";
import { Reviewer, BitbucketIssueData } from "../bitbucket/model";
import { MinimalIssue } from "../jira/jira-client/model/entities";

export interface PostComment extends Action {
    content: string;
    parentCommentId?: number;
}

export function isPostComment(a: Action): a is PostComment {
    return (<PostComment>a).content !== undefined;
}

export interface RefreshPullRequest extends Action {
    action: 'refreshPR';
}

export interface UpdateApproval extends Action {
    action: 'updateApproval';
    approved: boolean;
}

export function isUpdateApproval(a: Action): a is UpdateApproval {
    return (<UpdateApproval>a).approved !== undefined;
}

export interface Merge extends Action {
    action: 'merge';
    mergeStrategy?: 'merge_commit' | 'squash' | 'fast_forward';
    closeSourceBranch?: boolean;
    issue?: MinimalIssue | BitbucketIssueData;
}

export function isMerge(a: Action): a is Merge {
    return (<Merge>a).action === 'merge';
}

export interface CopyPullRequestLink extends Action {
    action: 'copyPullRequestLink';
}

export interface OpenPullRequest extends Action {
    action: 'openPullRequest';
    prHref: string;
}

export interface Checkout extends Action {
    action: 'checkout';
    branch: string;
    isSourceBranch: boolean;
}

export function isCheckout(a: Action): a is Checkout {
    return (<Checkout>a).branch !== undefined;
}

export interface CreatePullRequest extends Action {
    action: 'createPullRequest';
    repoUri: string;
    remote: Remote;
    reviewers: Reviewer[];
    title: string;
    summary: string;
    sourceBranch: Branch;
    destinationBranch: Branch;
    pushLocalChanges: boolean;
    closeSourceBranch: boolean;
    issue?: MinimalIssue | BitbucketIssueData;
}

export function isCreatePullRequest(a: Action): a is CreatePullRequest {
    return (<CreatePullRequest>a).action === 'createPullRequest';
}

export interface FetchDetails extends Action {
    action: 'fetchDetails';
    repoUri: string;
    remote: Remote;
    sourceBranch: Branch;
    destinationBranch: Branch;
}

export interface FetchIssue extends Action {
    action: 'fetchIssue';
    repoUri: string;
    sourceBranch: Branch;
}

export function isFetchDetails(a: Action): a is FetchDetails {
    return (<FetchDetails>a).action === 'fetchDetails';
}

export function isFetchIssue(a: Action): a is FetchIssue {
    return (<FetchIssue>a).action === 'fetchIssue';
}

export function isOpenPullRequest(a: Action): a is OpenPullRequest {
    return (<OpenPullRequest>a).action === 'openPullRequest';
}

export interface FetchUsers extends Action {
    action: 'fetchUsers';
    query: string;
    remote: Remote;
}

export function isFetchUsers(a: Action): a is FetchUsers {
    return (<FetchUsers>a).action === 'fetchUsers' && (<FetchUsers>a).query !== undefined;
}

export interface OpenBuildStatusAction extends Action {
    action: 'openBuildStatus';
    buildStatusUri: string;
}

export function isOpenBuildStatus(a: Action): a is OpenBuildStatusAction {
    return (<OpenBuildStatusAction>a).buildStatusUri !== undefined;
}