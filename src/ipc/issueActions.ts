import { Action } from "./messaging";
import { Transition, Issue } from "../jira/jiraModel";

export interface TransitionIssueAction extends Action {
    issue: Issue;
    transition: Transition;
}

export function isTransitionIssue(a: Action): a is TransitionIssueAction {
    return (<TransitionIssueAction>a).transition !== undefined && (<TransitionIssueAction>a).issue !== undefined;
}