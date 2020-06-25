import { BitbucketIssue } from '../bitbucket/model';
import { Message } from './messaging';
import { RepoData } from './prMessaging';

export interface StartWorkOnBitbucketIssueData extends Message {
    type: 'startWorkOnBitbucketIssueData';
    issue: BitbucketIssue;
    repoData: RepoData[];
}

export function isStartWorkOnBitbucketIssueData(a: Message): a is StartWorkOnBitbucketIssueData {
    return (<StartWorkOnBitbucketIssueData>a).type === 'startWorkOnBitbucketIssueData';
}
