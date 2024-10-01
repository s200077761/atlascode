import { BitbucketIssue, BitbucketSite } from '../../../../bitbucket/model';

export interface CreateBitbucketIssueActionApi {
    createIssue(
        site: BitbucketSite,
        title: string,
        description: string,
        kind: string,
        priority: string,
    ): Promise<BitbucketIssue>;
}
