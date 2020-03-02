import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models/entities';
import { DetailedSiteInfo } from '../atlclients/authInfo';
import {
    ApprovalStatus,
    BitbucketIssue,
    BitbucketSite,
    FileChange,
    Reviewer,
    SiteRemote,
    Task,
    WorkspaceRepo
} from '../bitbucket/model';
import { Branch } from '../typings/git';
import { FileDiffQueryParams } from '../views/pullrequest/pullRequestNode';
import { Action } from './messaging';

export interface CreateTask extends Action {
    action: 'createTask';
    task: Task;
    commentId?: string;
}

export interface EditTask extends Action {
    action: 'editTask';
    task: Task;
}

export interface DeleteTask extends Action {
    action: 'deleteTask';
    task: Task;
}

export function isCreateTask(a: Action): a is CreateTask {
    return (<CreateTask>a).action === 'createTask';
}

export function isEditTask(a: Action): a is EditTask {
    return (<EditTask>a).action === 'editTask';
}

export function isDeleteTask(a: Action): a is DeleteTask {
    return (<DeleteTask>a).action === 'deleteTask';
}

export function isReady(a: Action): a is Ready {
    return (<Ready>a).action === 'ready';
}

export interface Ready extends Action {
    action: 'ready';
}

export interface DeleteComment extends Action {
    commentId: string;
}

export interface EditComment extends Action {
    content: string;
    commentId: string;
}

export interface PostComment extends Action {
    content: string;
    parentCommentId?: string;
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

export interface AddReviewer extends Action {
    action: 'addReviewer';
    accountId: string;
}

export function isAddReviewer(a: Action): a is AddReviewer {
    return (<AddReviewer>a).accountId !== undefined;
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
    destinationSite: BitbucketSite;
    reviewers: Reviewer[];
    title: string;
    summary: string;
    sourceSiteRemote: SiteRemote;
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
    wsRepo: WorkspaceRepo;
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

export interface FetchDefaultReviewers extends Action {
    action: 'fetchDefaultReviewers';
    site: BitbucketSite;
}

export function isFetchDefaultReviewers(a: Action): a is FetchDefaultReviewers {
    return (
        (<FetchDefaultReviewers>a).action === 'fetchDefaultReviewers' && (<FetchDefaultReviewers>a).site !== undefined
    );
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
