import { Message } from "./messaging";

// PRData is the message that gets sent to the PullRequestPage react view containing the PR details.
export interface PRData extends Message {
    currentUser?: Bitbucket.Schema.User;
    pr?: Bitbucket.Schema.Pullrequest;
    commits?: Bitbucket.Schema.Commit[];
    comments?: Bitbucket.Schema.Comment[];
    currentBranch: string;
}
