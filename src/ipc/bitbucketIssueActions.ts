import { Branch } from "src/typings/git";
import { BitbucketIssue } from "../bitbucket/model";
import { Action } from "./messaging";
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
    repoUri: string;
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
    issue: BitbucketIssue;
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
}

export function isOpenStartWorkPageAction(a: Action): a is OpenStartWorkPageAction {
    return (<OpenStartWorkPageAction>a).action === 'openStartWorkPage';
}

export interface CreateJiraIssueAction extends Action {
    action: 'createJiraIssue';
}

export function isCreateJiraIssueAction(a: Action): a is CreateJiraIssueAction {
    return (<CreateJiraIssueAction>a).action === 'createJiraIssue';
}