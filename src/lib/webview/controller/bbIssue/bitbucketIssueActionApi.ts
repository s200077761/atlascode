import { BitbucketIssue, Comment, User } from '../../../../bitbucket/model';

export interface BitbucketIssueActionApi {
    currentUser(issue: BitbucketIssue): Promise<User>;
    getIssue(issue: BitbucketIssue): Promise<BitbucketIssue>;
    getComments(issue: BitbucketIssue): Promise<Comment[]>;
    postComment(issue: BitbucketIssue, content: string): Promise<Comment>;
    updateStatus(issue: BitbucketIssue, status: string): Promise<[string, any]>;
}
