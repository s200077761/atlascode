import { Action } from "./messaging";
import { Issue } from "src/jira/jiraIssue";

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

export interface OpenJiraIssue extends Action {
    action: 'openJiraIssue';
    issue: Issue;
}

export interface Checkout extends Action {
    action: 'checkout';
    branch: string;
    isSourceBranch: boolean;
}

export function isCheckout(a: Action): a is Checkout {
    return (<Checkout>a).branch !== undefined;
}

export function isOpenJiraIssue(a: Action): a is OpenJiraIssue {
    return (<OpenJiraIssue>a).issue !== undefined;
}