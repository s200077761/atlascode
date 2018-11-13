import { Action } from "./messaging";

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

export interface Checkout extends Action {
    action: 'checkout';
    branch: string;
}

export function isCheckout(a: Action): a is Checkout {
    return (<Checkout>a).branch !== undefined;
}
