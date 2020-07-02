import { PullRequest, User } from '../../../../bitbucket/model';

export interface PullRequestDetailsActionApi {
    fetchUsers(pr: PullRequest, query: string, abortKey: string | undefined): Promise<User[]>;
    updateSummary(pr: PullRequest, text: string): Promise<void>;
    updateTitle(pr: PullRequest, text: string): Promise<void>;
    getCurrentUser(pr: PullRequest): Promise<User>;
    getPR(pr: PullRequest): Promise<PullRequest>;
}
