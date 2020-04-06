import { BitbucketIssue, Comment } from '../../../../bitbucket/model';

export interface BitbucketIssueActionApi {
    getIssue(issue: BitbucketIssue): Promise<BitbucketIssue>;
    getComments(issue: BitbucketIssue): Promise<Comment[]>;
    updateStatus(issue: BitbucketIssue, status: string): Promise<void>;
}
