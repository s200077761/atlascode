import { BitbucketIssue, Comment } from '../../../../bitbucket/model';

export interface BitbucketIssueActionApi {
    getComments(issue: BitbucketIssue): Promise<Comment[]>;
}
