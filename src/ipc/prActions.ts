import { MinimalIssue } from "jira-pi-client";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { ApprovalStatus, BitbucketIssue, BitbucketSite, FileChange, Reviewer, WorkspaceRepo } from "../bitbucket/model";
import { Branch } from "../typings/git";
import { FileDiffQueryParams } from "../views/pullrequest/pullRequestNode";
import { Action } from "./messaging";

export interface DeleteComment extends Action {
    commentId: number;
}

export interface EditComment extends Action {
    content: string;
    commentId: number;
}

export interface PostComment extends Action {
    content: string;
    parentCommentId?: number;
}

export function isDeleteComment(a: Action): a is DeleteComment {
    return (<DeleteComment>a).commentId !== undefined;
}

export function isEditComment(a: Action): a is EditComment {
    return (<EditComment>a).content !== undefined && (<EditComment>a).commentId !== undefined;
}

export function isPostComment(a: Action): a is PostComment {
    return (<PostComment>a).content !== undefined;
}

export interface RefreshPullRequest extends Action {
    action: 'refreshPR';
}

export interface UpdateTitle extends Action {
    action: 'updateTitle';
    text: string;
}

export function isUpdateTitle(a: Action): a is UpdateTitle {
    return (<UpdateTitle>a).text !== undefined;
}

export interface UpdateApproval extends Action {
    action: 'updateApproval';
    status: ApprovalStatus;
}

export function isUpdateApproval(a: Action): a is UpdateApproval {
    return (<UpdateApproval>a).status !== undefined;
}

export interface Merge extends Action {
    action: 'merge';
    mergeStrategy?: string;
    commitMessage: string;
    closeSourceBranch?: boolean;
    issue?: MinimalIssue<DetailedSiteInfo> | BitbucketIssue;
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
    workspaceRepo: WorkspaceRepo;
    site: BitbucketSite;
    reviewers: Reviewer[];
    title: string;
    summary: string;
    sourceBranch: Branch;
    destinationBranch: Branch;
    pushLocalChanges: boolean;
    closeSourceBranch: boolean;
    issue?: MinimalIssue<DetailedSiteInfo> | BitbucketIssue;
}

export function isCreatePullRequest(a: Action): a is CreatePullRequest {
    return (<CreatePullRequest>a).action === 'createPullRequest';
}

export interface FetchDetails extends Action {
    action: 'fetchDetails';
    site: BitbucketSite;
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
    site: BitbucketSite;
    query: string;
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

export interface OpenDiffPreviewAction extends Action {
    action: 'openDiffPreview';
    lhsQuery: FileDiffQueryParams;
    rhsQuery: FileDiffQueryParams;
    fileDisplayName: string;
}

export function isOpenDiffPreview(a: Action): a is OpenDiffPreviewAction {
    return (<OpenDiffPreviewAction>a).action === 'openDiffPreview';
}

export interface OpenDiffViewAction extends Action {
    action: 'openDiffView';
    fileChange: FileChange;
}

export function isOpenDiffView(a: Action): a is OpenDiffViewAction {
    return (<OpenDiffViewAction>a).action === 'openDiffView';
}