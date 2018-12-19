import { PullRequest } from "./model";
import { GitBackend } from "../codebucket/backend/backend-git";
import { parseJiraIssueKeys } from "../jira/issueKeyParser";
import { Logger } from "../logger";

export async function extractIssueKeys(pr: PullRequest, allComments: Bitbucket.Schema.Comment[]): Promise<string[]> {
    const result = new Set<string>();

    try {
        await pr.repository.fetch();
        const b = new GitBackend(pr.repository.rootUri.fsPath);
        const text = await b.getRevisionMessage(`${pr.data.destination!.commit!.hash!}..${pr.data.source!.commit!.hash!}`);
        const commitMessageMatches = parseJiraIssueKeys(text);
        commitMessageMatches.forEach(m => result.add(m));

        const prTitleMatches = parseJiraIssueKeys(pr.data.title!);
        prTitleMatches.forEach(m => result.add(m));

        const prSummaryMatches = parseJiraIssueKeys(pr.data.summary!.raw!);
        prSummaryMatches.forEach(m => result.add(m));

        const prCommentsMatches = allComments.map(c => parseJiraIssueKeys(c.content!.raw!)).reduce((prev, curr) => prev.concat(curr), []);
        prCommentsMatches.forEach(m => result.add(m));

        return Array.from(result);
    } catch (e) {
        Logger.debug('error fetching related Jira issues: ', e);
        return [];
    }
}
