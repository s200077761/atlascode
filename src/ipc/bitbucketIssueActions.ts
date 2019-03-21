import { Action } from "./messaging";

export interface CopyBitbucketIssueLink extends Action {
    action: 'copyBitbucketIssueLink';
}

export interface PostComment extends Action {
    action: 'comment';
    content: string;
}

export function isPostComment(a: Action): a is PostComment {
    return (<PostComment>a).content !== undefined;
}

export interface PostChange extends Action {
    action: 'change';
    newStatus: string;
    content?: string;
}

export function isPostChange(a: Action): a is PostChange {
    return (<PostChange>a).newStatus !== undefined;
}

export interface CreateBitbucketIssueAction extends Action {
    action: 'create';
    href: string;
    title: string;
    description: string;
    kind: string;
    priority: string;
}

export function isCreateBitbucketIssueAction(a: Action): a is CreateBitbucketIssueAction {
    return (<CreateBitbucketIssueAction>a).action === 'create';
}