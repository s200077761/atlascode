import { Action } from "./messaging";

export interface CopyBitbucketIssueLink extends Action {
    action: 'copyBitbucketIssueLink';
}

export interface AssignToMe extends Action {
    action: 'assign';
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

export interface OpenBitbucketIssueAction extends Action {
    action: 'openBitbucketIssue';
    issue: Bitbucket.Schema.Issue;
}

export function isOpenBitbucketIssueAction(a: Action): a is OpenBitbucketIssueAction {
    return (<OpenBitbucketIssueAction>a).issue !== undefined;
}

export interface OpenStartWorkPageAction extends Action {
    action: 'openStartWorkPage';
    issue: Bitbucket.Schema.Issue;
}

export function isOpenStartWorkPageAction(a: Action): a is OpenStartWorkPageAction {
    return (<OpenStartWorkPageAction>a).issue !== undefined;
}