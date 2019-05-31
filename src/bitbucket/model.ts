import { Repository, Remote } from "../typings/git";
import Bitbucket from 'bitbucket';

export type User = {
    accountId: string;
    displayName: string;
    url: string;
    avatarUrl: string;
};

export type Reviewer = User & {
    approved: boolean;
    role: "PARTICIPANT" | "REVIEWER";
};

export interface Repo {
    scm?: Repository;
    name: string;
    displayName: string;
    url: string;
    avatarUrl: string;
    mainbranch?: string;
    issueTrackerEnabled: boolean;
}

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
    data: Bitbucket.Schema.Commit[];
    next?: string;
}

export interface PaginatedComments {
    data: Bitbucket.Schema.PullrequestComment[];
    next?: string;
}

export interface PaginatedFileChanges {
    data: Bitbucket.Schema.Diffstat[];
    next?: string;
}

export interface PaginatedBitbucketIssues {
    repository: Repository;
    remote: Remote;
    data: Bitbucket.Schema.Issue[];
    next?: string;
}

export interface PaginatedIssueChange {
    data: Bitbucket.Schema.IssueChange[];
    next?: string;
}