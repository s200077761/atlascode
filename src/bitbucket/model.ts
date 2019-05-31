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

export type FileChange = {
    status: "added" | "removed" | "modified" | "renamed" | "merge conflict";
    oldPath?: string;
    newPath?: string;
};

export interface PullRequest {
    repository: Repository;
    remote: Remote;
    sourceRemote?: Remote;
    data: Bitbucket.Schema.Pullrequest;
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