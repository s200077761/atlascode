import { Repository, Remote } from "../typings/git";
import Bitbucket from 'bitbucket';

export type User = {
    accountId: string;
    displayName: string;
    url: string;
    avatarUrl: string;
};

export const UnknownUser = {
    accountId: '',
    displayName: 'Unknown User',
    url: '',
    avatarUrl: ''
};

export type Reviewer = User & {
    approved: boolean;
    role: "PARTICIPANT" | "REVIEWER";
};

export type Repo = {
    scm?: Repository;
    name: string;
    displayName: string;
    fullName: string;
    url: string;
    avatarUrl: string;
    mainbranch?: string;
    issueTrackerEnabled: boolean;
};

export type Comment = {
    id: number;
    parentId?: number;
    user: User;
    htmlContent: string;
    rawContent: string;
    ts: string;
    updatedTs: string;
    deleted: boolean;
    inline?: {
        from?: number;
        path: string;
        to?: number;
    };
};

export type Commit = {
    author: User;
    ts: string;
    hash: string;
    message: string;
    url: string;
    htmlSummary?: string;
    rawSummary?: string;
};

export type BuildStatus = {
    name: string;
    state: "SUCCESSFUL" | "FAILED" | "INPROGRESS" | "STOPPED";
    url: string;
    ts: string;
};

export type FileChange = {
    status: "added" | "removed" | "modified" | "renamed" | "merge conflict";
    oldPath?: string;
    newPath?: string;
};

export type CreatePullRequestData = {
    reviewerAccountIds: string[];
    title: string;
    summary: string;
    sourceBranchName: string;
    destinationBranchName: string;
    closeSourceBranch: boolean;
};

export type PullRequestData = {
    id: number;
    url: string;
    author: User;
    reviewers: Reviewer[];
    participants: Reviewer[];
    source: {
        repo: Repo;
        branchName: string;
        commitHash: string;
    },
    destination: {
        repo: Repo;
        branchName: string;
        commitHash: string;
    },
    title: string;
    htmlSummary?: string;
    rawSummary?: string;
    ts: string;
    updatedTs: string;
    state: "MERGED" | "SUPERSEDED" | "OPEN" | "DECLINED";
    closeSourceBranch: boolean;
    taskCount: number;
    buildStatuses?: BuildStatus[];
};

export interface PullRequest {
    repository: Repository;
    remote: Remote;
    sourceRemote?: Remote;
    data: PullRequestData;
}

export interface PaginatedPullRequests {
    // Repeating repository and remote fields although they are available from
    // individual pull requests for 1) convenience and 2) handle case when `data` is empty.
    repository: Repository;
    remote: Remote;
    data: PullRequest[];
    next?: string;
}

export interface PaginatedCommits {
    data: Commit[];
    next?: string;
}

export interface PaginatedComments {
    data: Comment[];
    next?: string;
}

export interface PaginatedFileChanges {
    data: FileChange[];
    next?: string;
}

export interface PaginatedBitbucketIssues {
    repository: Repository;
    remote: Remote;
    data: Bitbucket.Schema.Issue[];
    next?: string;
}

export type BitbucketIssue = Bitbucket.Schema.Issue;
export type BitbucketBranchingModel = Bitbucket.Schema.BranchingModel;