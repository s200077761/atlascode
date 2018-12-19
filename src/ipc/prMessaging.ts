import { Message } from "./messaging";
import { Issue } from "../jira/jiraModel";

// PRData is the message that gets sent to the PullRequestPage react view containing the PR details.
export interface PRData extends Message {
    currentUser?: Bitbucket.Schema.User;
    pr?: Bitbucket.Schema.Pullrequest;
    commits?: Bitbucket.Schema.Commit[];
    comments?: Bitbucket.Schema.Comment[];
    currentBranch: string;
    relatedJiraIssues: Issue[];
    errors?: string;
}

export function isPRData(a: Message): a is PRData {
    return (<PRData>a).type === 'update';
}

export interface CheckoutResult extends Message {
    error?: string;
    currentBranch: string;
}

export function isCheckoutError(a: Message): a is CheckoutResult {
    return (<CheckoutResult>a).type === 'checkout';
}
