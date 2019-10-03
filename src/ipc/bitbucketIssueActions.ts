import { Action } from "./messaging";
import { BitbucketIssueData } from "../bitbucket/model";
import { Branch } from "src/typings/git";
import { RepoData } from "./prMessaging";

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
    issue: BitbucketIssueData;
}

export function isOpenBitbucketIssueAction(a: Action): a is OpenBitbucketIssueAction {
    return (<OpenBitbucketIssueAction>a).issue !== undefined;
}

export interface UpdateDiffAction extends Action {
    action: 'updateDiff';
    repoData: RepoData;
    sourceBranch: Branch;
    destinationBranch: Branch;
}

export function isUpdateDiffAction(a: Action): a is UpdateDiffAction {
    return (<UpdateDiffAction>a).action === 'updateDiff';
}

export interface OpenStartWorkPageAction extends Action {
    action: 'openStartWorkPage';
    issue: BitbucketIssueData;
}

export function isOpenStartWorkPageAction(a: Action): a is OpenStartWorkPageAction {
    return (<OpenStartWorkPageAction>a).issue !== undefined;
}

export interface CreateJiraIssueAction extends Action {
    action: 'createJiraIssue';
    issue: BitbucketIssueData;
}

export function isCreateJiraIssueAction(a: Action): a is CreateJiraIssueAction {
    return (<CreateJiraIssueAction>a).issue !== undefined
        && (<CreateJiraIssueAction>a).action === 'createJiraIssue';
}