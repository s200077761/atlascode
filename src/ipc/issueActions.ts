import { Action } from "./messaging";
import { Transition, Issue } from "../jira/jiraModel";

export interface TransitionIssueAction extends Action {
    issue: Issue;
    transition: Transition;
}

export interface IssueCommentAction extends Action {
    issue: Issue;
    comment: string;
}

export function isTransitionIssue(a: Action): a is TransitionIssueAction {
    return (<TransitionIssueAction>a).transition !== undefined && (<TransitionIssueAction>a).issue !== undefined;
}

export function isIssueComment(a: Action): a is  IssueCommentAction {
    return (<IssueCommentAction>a).comment !== undefined &&  (<IssueCommentAction>a).issue !== undefined;
}