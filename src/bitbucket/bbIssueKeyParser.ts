const BitbucketIssueKeyRegEx = new RegExp(/#\d+/g);

export function parseBitbucketIssueKeys(text?: string): string[] {
    if (!text) {
        return [];
    }
    const issueKeys = text.match(BitbucketIssueKeyRegEx) || [];
    return Array.from(new Set(issueKeys));
}
