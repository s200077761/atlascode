import { Action } from "./messaging";
import { WorkingProject } from "../config/model";
import { MinimalIssue, Transition, IssueKeyAndSite, MinimalIssueOrKeyAndSiteOrKey } from "../jira/jira-client/model/entities";
import { FieldValues, IssueLinkTypeSelectOption } from "../jira/jira-client/model/fieldUI";
import { DetailedSiteInfo } from "../atlclients/authInfo";

export interface RefreshIssueAction extends Action {
    action: 'refreshIssue';
}

export interface EditIssueAction extends Action {
    action: 'editIssue';
    fields: FieldValues;
}

export interface TransitionIssueAction extends Action {
    action: 'transitionIssue';
    issue: MinimalIssue;
    transition: Transition;
}

export interface IssueCommentAction extends Action {
    action: 'comment';
    issue: IssueKeyAndSite;
    comment: string;
}

export interface IssueAssignAction extends Action {
    action: 'assign';
    issue: MinimalIssue;
    userId?: string;
}

export interface SetIssueTypeAction extends Action {
    action: 'setIssueType';
    id: string;
}

export interface OpenJiraIssueAction extends Action {
    action: 'openJiraIssue';
    issueOrKey: MinimalIssueOrKeyAndSiteOrKey;
}

export interface CopyJiraIssueLinkAction extends Action {
    action: 'copyJiraIssueLink';
}

export interface FetchQueryAction extends Action {
    query: string;
    site: DetailedSiteInfo;
    autocompleteUrl?: string;
}

export interface FetchByProjectQueryAction extends Action {
    query: string;
    project: string;
}

export interface FetchIssueFieldOptionsByJQLAction extends Action {
    jql: string;
    fieldId: string;
}

export interface ScreensForProjectsAction extends Action {
    project: WorkingProject;
}

export interface CreateSomethingAction extends Action {
    createData: any;
}

export interface CreateIssueAction extends Action {
    site: DetailedSiteInfo;
    issueData: any;
}

export interface CreateIssueLinkAction extends Action {
    site: DetailedSiteInfo;
    issueLinkData: any;
    issueLinkType: IssueLinkTypeSelectOption;
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
    issue: MinimalIssue;
}

export function isTransitionIssue(a: Action): a is TransitionIssueAction {
    return (<TransitionIssueAction>a).transition !== undefined && (<TransitionIssueAction>a).issue !== undefined;
}

export function isSetIssueType(a: Action): a is SetIssueTypeAction {
    return (<SetIssueTypeAction>a).id !== undefined && a.action === 'setIssueType';
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
    return a && (<FetchQueryAction>a).query !== undefined
        && (<FetchQueryAction>a).site !== undefined;
}

export function isFetchByProjectQuery(a: Action): a is FetchByProjectQueryAction {
    return (<FetchByProjectQueryAction>a).query !== undefined
        && (<FetchByProjectQueryAction>a).project !== undefined;
}

export function isFetchOptionsJQL(a: Action): a is FetchIssueFieldOptionsByJQLAction {
    return (<FetchIssueFieldOptionsByJQLAction>a).jql !== undefined
        && (<FetchIssueFieldOptionsByJQLAction>a).fieldId !== undefined;
}

export function isScreensForProjects(a: Action): a is ScreensForProjectsAction {
    return (<ScreensForProjectsAction>a).project !== undefined;
}

export function isCreateSomething(a: Action): a is CreateSomethingAction {
    return (<CreateSomethingAction>a).createData !== undefined;
}

export function isCreateIssue(a: Action): a is CreateIssueAction {
    return a && (<CreateIssueAction>a).issueData !== undefined
        && (<CreateIssueAction>a).site !== undefined;
}

export function isCreateIssueLink(a: Action): a is CreateIssueLinkAction {
    return a && (<CreateIssueLinkAction>a).issueLinkData !== undefined
        && (<CreateIssueLinkAction>a).site !== undefined
        && (<CreateIssueLinkAction>a).issueLinkType !== undefined;
}

export function isStartWork(a: Action): a is StartWorkAction {
    return (<StartWorkAction>a).transition !== undefined;
}

export function isOpenStartWorkPageAction(a: Action): a is OpenStartWorkPageAction {
    return (<OpenStartWorkPageAction>a).issue !== undefined;
}