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

export interface FetchQueryAction extends Action {
    query: string;
}

export interface ScreensForProjectsAction extends Action {
    project: WorkingProject;
}

export interface CreateSomethingAction extends Action {
    createData: any;
}

export interface CreateIssueAction extends Action {
    issueData: any;
}

export interface OpenIssueAction extends Action {
    key: string;
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

export function isFetchQuery(a: Action): a is  FetchQueryAction {
    return (<FetchQueryAction>a).query !== undefined;
}

export function isScreensForProjects(a: Action): a is  ScreensForProjectsAction {
    return (<ScreensForProjectsAction>a).project !== undefined;
}

export function isCreateSomething(a: Action): a is  CreateSomethingAction {
    return (<CreateSomethingAction>a).createData !== undefined;
}

export function isCreateIssue(a: Action): a is  CreateIssueAction {
    return (<CreateIssueAction>a).issueData !== undefined;
}

export function isOpenIssueAction(a: Action): a is  OpenIssueAction {
    return (<OpenIssueAction>a).key !== undefined;
}