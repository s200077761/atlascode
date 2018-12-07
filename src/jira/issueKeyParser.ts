export const IssueKeyRegEx = new RegExp(/[A-Z]+-\d+/g);

export function parseJiraIssueKeys(text: string): string[] {
    const issueKeys = text.match(IssueKeyRegEx) || [];
    return Array.from(new Set(issueKeys));
}