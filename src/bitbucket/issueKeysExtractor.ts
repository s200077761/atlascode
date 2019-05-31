import { PullRequest, Comment } from "./model";
import { parseJiraIssueKeys } from "../jira/issueKeyParser";
import { Logger } from "../logger";
import { parseBitbucketIssueKeys } from "./bbIssueKeyParser";

export async function extractIssueKeys(pr: PullRequest, commits: Bitbucket.Schema.Commit[], allComments: Comment[]): Promise<string[]> {
    const result = new Set<string>();

    try {
        const text = commits.map(c => c.message).join('\n');
        const commitMessageMatches = parseJiraIssueKeys(text);
        commitMessageMatches.forEach(m => result.add(m));

        const prTitleMatches = parseJiraIssueKeys(pr.data.title!);
        prTitleMatches.forEach(m => result.add(m));

        const prSummaryMatches = parseJiraIssueKeys(pr.data.summary!.raw!);
        prSummaryMatches.forEach(m => result.add(m));

        const prCommentsMatches = allComments.map(c => parseJiraIssueKeys(c.rawContent)).reduce((prev, curr) => prev.concat(curr), []);
        prCommentsMatches.forEach(m => result.add(m));

        return Array.from(result);
    } catch (e) {
        Logger.debug('error fetching related Jira issues: ', e);
        return [];
    }
}

export async function extractBitbucketIssueKeys(pr: PullRequest, commits: Bitbucket.Schema.Commit[], allComments: Comment[]): Promise<string[]> {
    const result = new Set<string>();

    try {
        const text = commits.map(c => c.message).join('\n');
        const commitMessageMatches = parseBitbucketIssueKeys(text);
        commitMessageMatches.forEach(m => result.add(m));

        const prTitleMatches = parseBitbucketIssueKeys(pr.data.title!);
        prTitleMatches.forEach(m => result.add(m));

        const prSummaryMatches = parseBitbucketIssueKeys(pr.data.summary!.raw!);
        prSummaryMatches.forEach(m => result.add(m));

        const prCommentsMatches = allComments.map(c => parseBitbucketIssueKeys(c.rawContent)).reduce((prev, curr) => prev.concat(curr), []);
        prCommentsMatches.forEach(m => result.add(m));

        return Array.from(result);
    } catch (e) {
        Logger.debug('error fetching related Bitbucket issues: ', e);
        return [];
    }
}
