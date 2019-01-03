import { Action } from "./messaging";
import { Transition, Issue } from "../jira/jiraModel";

export interface TransitionIssueAction extends Action {
    action: 'transitionIssue';
    issue: Issue;
    transition: Transition;
}

export interface IssueCommentAction extends Action {
    action: 'comment';
    issue: Issue;
    comment: string;
}

export interface IssueAssignAction extends Action {
    action: 'assign';
    issue: Issue;
}

export interface OpenJiraIssueAction extends Action {
    action: 'openJiraIssue';
    issue: Issue;
}

export function isTransitionIssue(a: Action): a is TransitionIssueAction {
    return (<TransitionIssueAction>a).transition !== undefined && (<TransitionIssueAction>a).issue !== undefined;
}

export function isIssueComment(a: Action): a is  IssueCommentAction {
    return (<IssueCommentAction>a).comment !== undefined &&  (<IssueCommentAction>a).issue !== undefined;
}

export function isIssueAssign(a: Action): a is  IssueAssignAction {
    return (<IssueAssignAction>a).issue !== undefined;
}

export function isOpenJiraIssue(a: Action): a is OpenJiraIssueAction {
    return (<OpenJiraIssueAction>a).issue !== undefined;
}
