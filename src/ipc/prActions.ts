import { Action } from "./messaging";
import { Branch, Remote } from "../typings/git";

export interface PostComment extends Action {
    content: string;
    parentCommentId?: number;
}

export function isPostComment(a: Action): a is PostComment {
    return (<PostComment>a).content !== undefined;
}

export interface Approve extends Action {
    action: 'approve';
}

export interface Merge extends Action {
    action: 'merge';
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
    title: string;
    summary: string;
    sourceBranch: Branch;
    destinationBranch: Branch;
    pushLocalChanges: boolean;
}

export function isCreatePullRequest(a: Action): a is CreatePullRequest {
    return (<CreatePullRequest>a).action === 'createPullRequest';
}

export interface FetchDetails extends Action {
    action: 'fetchDetails';
    repoUri: string;
    remote: Remote;
    title: string;
    summary: string;
    sourceBranch: Branch;
    destinationBranch: Branch;
}

export function isFetchDetails(a: Action): a is FetchDetails {
    return (<FetchDetails>a).action === 'fetchDetails';
}
