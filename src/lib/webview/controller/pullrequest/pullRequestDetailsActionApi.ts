import { ApprovalStatus, BitbucketSite, PullRequest, Reviewer, User } from '../../../../bitbucket/model';

export interface PullRequestDetailsActionApi {
    fetchUsers(site: BitbucketSite, query: string, abortKey?: string): Promise<User[]>;
    updateSummary(pr: PullRequest, text: string): Promise<PullRequest>;
    updateTitle(pr: PullRequest, text: string): Promise<PullRequest>;
    getCurrentUser(pr: PullRequest): Promise<User>;
    getPR(pr: PullRequest): Promise<PullRequest>;
    updateReviewers(pr: PullRequest, newReviewers: User[]): Promise<Reviewer[]>;
    updateApprovalStatus(pr: PullRequest, status: ApprovalStatus): Promise<ApprovalStatus>;
    checkout(pr: PullRequest): Promise<string>;
    getCurrentBranchName(pr: PullRequest): string;
}
