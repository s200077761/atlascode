import { Commit, PullRequest, User } from '../../../../bitbucket/model';

export interface PullRequestDetailsActionApi {
    fetchUsers(pr: PullRequest, query: string, abortKey: string | undefined): Promise<User[]>;
    updateSummary(pr: PullRequest, text: string): Promise<PullRequest>;
    updateTitle(pr: PullRequest, text: string): Promise<PullRequest>;
    getCurrentUser(pr: PullRequest): Promise<User>;
    getPR(pr: PullRequest): Promise<PullRequest>;

    getCommits(pr: PullRequest): Promise<Commit[]>;
}
