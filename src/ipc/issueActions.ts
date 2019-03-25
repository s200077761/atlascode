import { Action } from "./messaging";
import { Transition, Issue } from "../jira/jiraModel";
import { WorkingProject } from "../config/model";

export interface RefreshIssueAction extends Action {
    action: 'refreshIssue';
}

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
    issueOrKey: Issue | string;
}

export interface CopyJiraIssueLinkAction extends Action {
    action: 'copyJiraIssueLink';
}

export interface FetchQueryAction extends Action {
    query: string;
}

export interface FetchUsersQueryAction extends Action {
    query: string;
    project: string;
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

export interface StartWorkAction extends Action {
    action: 'startWork';
    transition: Transition;
    repoUri: string;
    sourceBranchName: string;
    branchName: string;
    remote: string;
    setupJira: boolean;
    setupBitbucket: boolean;
}

export interface OpenStartWorkPageAction extends Action {
    action: 'openStartWorkPage';
    issue: Issue;
}

export function isTransitionIssue(a: Action): a is TransitionIssueAction {
    return (<TransitionIssueAction>a).transition !== undefined && (<TransitionIssueAction>a).issue !== undefined;
}

export function isIssueComment(a: Action): a is IssueCommentAction {
    return (<IssueCommentAction>a).comment !== undefined && (<IssueCommentAction>a).issue !== undefined;
}

export function isIssueAssign(a: Action): a is IssueAssignAction {
    return (<IssueAssignAction>a).issue !== undefined;
}
export function isOpenJiraIssue(a: Action): a is OpenJiraIssueAction {
    return (<OpenJiraIssueAction>a).issueOrKey !== undefined;
}

export function isFetchQuery(a: Action): a is FetchQueryAction {
    return (<FetchQueryAction>a).query !== undefined;
}

export function isFetchUsersQuery(a: Action): a is FetchUsersQueryAction {
    return (<FetchUsersQueryAction>a).query !== undefined
        && (<FetchUsersQueryAction>a).project !== undefined;
}

export function isScreensForProjects(a: Action): a is ScreensForProjectsAction {
    return (<ScreensForProjectsAction>a).project !== undefined;
}

export function isCreateSomething(a: Action): a is CreateSomethingAction {
    return (<CreateSomethingAction>a).createData !== undefined;
}

export function isCreateIssue(a: Action): a is CreateIssueAction {
    return (<CreateIssueAction>a).issueData !== undefined;
}

export function isStartWork(a: Action): a is StartWorkAction {
    return (<StartWorkAction>a).transition !== undefined;
}

export function isOpenStartWorkPageAction(a: Action): a is OpenStartWorkPageAction {
    return (<OpenStartWorkPageAction>a).issue !== undefined;
}