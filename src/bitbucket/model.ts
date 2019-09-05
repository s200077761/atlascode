import { Repository, Remote } from "../typings/git";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { BitbucketIssuesApiImpl } from "./bitbucket-cloud/bbIssues";
import { PipelineApiImpl } from "../pipelines/pipelines";

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
    mention: string;
    approved: boolean;
    role: "PARTICIPANT" | "REVIEWER";
};

export type Repo = {
    id: string;
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
    children: Comment[];
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
    version: number;
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
    data: BitbucketIssue[];
    next?: string;
}

export interface PaginatedBranchNames {
    data: string[];
    next?: string;
}

export type BitbucketIssue = {
    repository: Repository;
    remote: Remote;
    data: BitbucketIssueData;
};

export type BitbucketIssueData = any;
export type BitbucketBranchingModel = any;

export interface PullRequestApi {
    getCurrentUser(site: DetailedSiteInfo): Promise<User>;
    getList(repository: Repository, remote: Remote, queryParams?: { pagelen?: number, sort?: string, q?: string }): Promise<PaginatedPullRequests>;
    getListCreatedByMe(repository: Repository, remote: Remote): Promise<PaginatedPullRequests>;
    getListToReview(repository: Repository, remote: Remote): Promise<PaginatedPullRequests>;
    nextPage({ repository, remote, next }: PaginatedPullRequests): Promise<PaginatedPullRequests>;
    getLatest(repository: Repository, remote: Remote): Promise<PaginatedPullRequests>;
    getRecentAllStatus(repository: Repository, remote: Remote): Promise<PaginatedPullRequests>;
    get(pr: PullRequest): Promise<PullRequest>;
    getChangedFiles(pr: PullRequest): Promise<PaginatedFileChanges>;
    getCommits(pr: PullRequest): Promise<PaginatedCommits>;
    getComments(pr: PullRequest): Promise<PaginatedComments>;
    getBuildStatuses(pr: PullRequest): Promise<BuildStatus[]>;
    getReviewers(remote: Remote, query?: string): Promise<Reviewer[]>;
    create(repository: Repository, remote: Remote, createPrData: CreatePullRequestData): Promise<PullRequest>;
    updateApproval(pr: PullRequest, approved: boolean): Promise<void>;
    merge(pr: PullRequest, closeSourceBranch?: boolean, mergeStrategy?: 'merge_commit' | 'squash' | 'fast_forward'): Promise<void>;
    postComment(remote: Remote, prId: number, text: string, parentCommentId?: number, inline?: { from?: number, to?: number, path: string }): Promise<Comment>;
}

export interface RepositoriesApi {
    get(remote: Remote): Promise<Repo>;
    getBranches(remote: Remote, queryParams?: any): Promise<PaginatedBranchNames>;
    getDevelopmentBranch(remote: Remote): Promise<string>;
    getBranchingModel(remote: Remote): Promise<BitbucketBranchingModel>;
    getCommitsForRefs(remote: Remote, includeRef: string, excludeRef: string): Promise<Commit[]>;
    getPullRequestIdsForCommit(repository: Repository, remote: Remote, commitHash: string): Promise<number[]>;
}

export interface BitbucketApi {
    repositories: RepositoriesApi;
    pullrequests: PullRequestApi;
    issues?: BitbucketIssuesApiImpl;
    pipelines?: PipelineApiImpl;
}

export interface BitbucketApi {
    repositories: RepositoriesApi;
    pullrequests: PullRequestApi;
}