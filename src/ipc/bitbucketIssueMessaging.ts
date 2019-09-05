import { Message } from "./messaging";
import { RepoData } from "./prMessaging";
import { User, Comment, BitbucketIssueData } from "../bitbucket/model";
import { Remote } from "../typings/git";

export interface BitbucketIssueMessageData extends Message {
    issueData: BitbucketIssueData;
    remote: Remote;
    currentUser: User;
    comments: Comment[];
    hasMore: boolean;
    showJiraButton: boolean;
}

export interface CreateBitbucketIssueData extends Message {
    type: 'createBitbucketIssueData';
    repoData: RepoData[];
}

export interface StartWorkOnBitbucketIssueData extends Message {
    type: 'startWorkOnBitbucketIssueData';
    issue: BitbucketIssueData;
    repoData: RepoData[];
}

export function isCreateBitbucketIssueData(a: Message): a is CreateBitbucketIssueData {
    return (<CreateBitbucketIssueData>a).type === 'createBitbucketIssueData';
}

export function isStartWorkOnBitbucketIssueData(a: Message): a is StartWorkOnBitbucketIssueData {
    return (<StartWorkOnBitbucketIssueData>a).type === 'startWorkOnBitbucketIssueData';
}