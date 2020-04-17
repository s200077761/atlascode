import { BitbucketIssue, Comment, User } from '../../../../bitbucket/model';

export interface BitbucketIssueActionApi {
    currentUser(issue: BitbucketIssue): Promise<User>;
    getIssue(issue: BitbucketIssue): Promise<BitbucketIssue>;
    getComments(issue: BitbucketIssue): Promise<Comment[]>;
    postComment(issue: BitbucketIssue, content: string): Promise<Comment>;
    updateStatus(issue: BitbucketIssue, status: string): Promise<[string, Comment]>;
    fetchUsers(issue: BitbucketIssue, query: string, abortKey?: string): Promise<User[]>;
    assign(issue: BitbucketIssue, accountId?: string): Promise<[User, Comment]>;
    openStartWorkPage(issue: BitbucketIssue): Promise<void>;
}
