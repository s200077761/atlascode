import { Message } from "./messaging";
import { Branch, Remote } from "../typings/git";
import { User, Reviewer, Comment, Commit, BitbucketIssueData, BitbucketBranchingModel, BuildStatus, PullRequestData, MergeStrategy, FileChange } from "../bitbucket/model";
import { MinimalIssue } from "../jira/jira-client/model/entities";
import { FileDiffQueryParams } from "../views/pullrequest/pullRequestNode";


// PRData is the message that gets sent to the PullRequestPage react view containing the PR details.
export interface PRData extends Message {
    pr?: PullRequestData;
    fileDiffs?: FileDiff[];
    repoUri: string;
    remote: Remote;
    currentUser?: User;
    currentBranch: string;
    commits?: Commit[];
    comments?: Comment[];
    relatedJiraIssues?: MinimalIssue[];
    relatedBitbucketIssues?: BitbucketIssueData[];
    mainIssue?: MinimalIssue | BitbucketIssueData;
    buildStatuses?: BuildStatus[];
    mergeStrategies: MergeStrategy[];
}

export function isPRData(a: Message): a is PRData {
    return (<PRData>a).type === 'update';
}

export interface BranchType {
    kind: string;
    prefix: string;
}

export interface DetailedFileChange extends FileChange {
    linesAdded?: number;
    linesRemoved?: number;
}

export interface FileDiff {
    file: string;
    status: FileStatus;
    linesAdded: number;
    linesRemoved: number;
    similarity?: number;
    lhsQueryParams?: FileDiffQueryParams;
    rhsQueryParams?: FileDiffQueryParams;
    fileChange?: FileChange;
}

export function convertDetailedFileChangeToFileDiff(fileChange: DetailedFileChange): FileDiff {
    return {
        file: getFileNameFromPaths(fileChange.oldPath, fileChange.newPath),
        status: mapStatusWordsToFileStatus(fileChange.status),
        linesAdded: !(fileChange.linesAdded === undefined) ? fileChange.linesAdded : -1,
        linesRemoved: !(fileChange.linesRemoved === undefined) ? fileChange.linesRemoved : -1,
        fileChange: fileChange
    };
}

function mapStatusWordsToFileStatus(status: string): FileStatus {
    if(status === 'added') {
        return FileStatus.ADDED;
    } else if(status === 'removed') {
        return FileStatus.DELETED;
    } else if(status === 'modified') {
        return FileStatus.MODIFIED;
    } else if(status === 'renamed') {
        return FileStatus.RENAMED;
    } else if(status === 'merge conflict') {
        return FileStatus.CONFLICT;
    } else {
        return FileStatus.UNKNOWN;
    }
}

function getFileNameFromPaths(oldPath: string | undefined, newPath: string | undefined): string {
    let fileDisplayName: string = '';
    if (newPath && oldPath && newPath !== oldPath) {
        fileDisplayName = `${oldPath} → ${newPath}`; //This is actually not what we want, but it'll have to be dealt with later...
    } else if (newPath) {
        fileDisplayName = newPath;
    } else if (oldPath) {
        fileDisplayName = oldPath;
    }
    return fileDisplayName;
}

export enum FileStatus {
    ADDED = 'A',
    DELETED = 'D',
    COPIED = 'C',
    MODIFIED = 'M',
    RENAMED = 'R',
    CONFLICT = 'CONFLICT',
    UNKNOWN = 'X'
}

export interface RepoData {
    uri: string;
    href?: string;
    avatarUrl?: string;
    name?: string;
    owner?: string;
    remotes: Remote[];
    defaultReviewers: User[];
    localBranches: Branch[];
    remoteBranches: Branch[];
    branchTypes: BranchType[];
    developmentBranch?: string;
    hasLocalChanges?: boolean;
    branchingModel?: BitbucketBranchingModel;
    isCloud: boolean;
}

export interface CreatePRData extends Message {
    repositories: RepoData[];
}

export function isCreatePRData(a: Message): a is CreatePRData {
    return (<CreatePRData>a).type === 'createPullRequestData';
}

export interface CheckoutResult extends Message {
    currentBranch: string;
}

export interface CommitsResult extends Message {
    type: 'commitsResult';
    error?: string;
    commits: Commit[];
}

export interface FetchIssueResult extends Message {
    type: 'fetchIssueResult';
    issue?: MinimalIssue | BitbucketIssueData;
}

export interface FetchUsersResult extends Message {
    type: 'fetchUsersResult';
    users: Reviewer[];
}

export function isCommitsResult(a: Message): a is CommitsResult {
    return (<CommitsResult>a).type === 'commitsResult';
}

export interface DiffResult extends Message {
    type: 'diffResult';
    fileDiffs: FileDiff[];
}

export function isDiffResult(a: Message): a is DiffResult {
    return (<DiffResult>a).type === 'diffResult';
}