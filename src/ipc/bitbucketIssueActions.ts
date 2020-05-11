import { Branch } from 'src/typings/git';
import { BitbucketIssue, BitbucketSite } from '../bitbucket/model';
import { Action } from './messaging';
import { RepoData } from './prMessaging';

export interface CopyBitbucketIssueLink extends Action {
    action: 'copyBitbucketIssueLink';
}

export interface CreateBitbucketIssueAction extends Action {
    action: 'create';
    site: BitbucketSite;
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
