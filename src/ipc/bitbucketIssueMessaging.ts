import { Message } from "./messaging";

export interface BitbucketIssueData extends Message {
    type: 'updateBitbucketIssue';
    issue: Bitbucket.Schema.Issue;
    currentUser: Bitbucket.Schema.User;
    comments: Bitbucket.Schema.Comment[];
}
