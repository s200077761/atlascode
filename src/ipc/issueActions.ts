import { Action } from "./messaging";
import { Transition, Issue } from "../jira/jiraModel";
import { WorkingProject } from "../config/model";

export interface TransitionIssueAction extends Action {
    issue: Issue;
    transition: Transition;
}

export interface IssueCommentAction extends Action {
    issue: Issue;
    comment: string;
}

export interface IssueAssignAction extends Action {
    issue: Issue;
}

export interface FetchProjectsAction extends Action {
    query: string;
}

export interface ScreensForProjectsAction extends Action {
    project: WorkingProject;
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

export function isFetchProjects(a: Action): a is  FetchProjectsAction {
    return (<FetchProjectsAction>a).query !== undefined;
}

export function isScreensForProjects(a: Action): a is  ScreensForProjectsAction {
    return (<ScreensForProjectsAction>a).project !== undefined;
}