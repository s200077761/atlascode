export enum FeedbackType {
    Bug = 'bug',
    Comment = 'comment',
    Suggestion = 'suggestion',
    Question = 'question',
    Empty = '',
}

//These IDs uniquely identify webviews for viewScreenEvents
export enum WebViewID {
    BitbucketIssueWebview = 'bitbucketIssueScreen',
    CreateBitbucketIssueWebview = 'createBitbucketIssueScreen',
    ConfigWebview = 'atlascodeSettings',
    OnboardingWebview = 'atlascodeOnboardingScreen',
    WelcomeWebview = 'atlascodeWelcomeScreen',
    StartWork = 'startWorkOnIssueScreen',
    PullRequestDetailsWebview = 'pullRequestDetailsScreen',
    CreatePullRequest = 'createPullRequestScreen',
    CreateJiraIssueWebview = 'atlascodeCreateIssueScreen',
}

export enum KnownLinkID {
    AtlascodeRepo = 'atlascodeRepoLink',
    AtlascodeIssues = 'atlascodeIssuesLink',
    AtlascodeDocs = 'atlascodeDocsLink',
    Integrations = 'integrationsLink',
    GettingStarted = 'gettingStartedLink',
    ReportAnIssue = 'reportAnIssueLink',
    WhatIsJQL = 'whatIsJQLLink',
    Contribute = 'contributeLink',
}

export const knownLinkIdMap: Map<string, string> = new Map([
    [KnownLinkID.AtlascodeRepo, 'https://bitbucket.org/atlassianlabs/atlascode'],
    [KnownLinkID.AtlascodeIssues, 'https://bitbucket.org/atlassianlabs/atlascode/issues'],
    [KnownLinkID.AtlascodeDocs, 'https://confluence.atlassian.com/display/BITBUCKET/Atlassian+for+VS+Code'],
    [KnownLinkID.Integrations, 'https://integrations.atlassian.com'],
    [
        KnownLinkID.GettingStarted,
        'https://confluence.atlassian.com/bitbucket/getting-started-with-vs-code-969520759.html',
    ],
    [KnownLinkID.ReportAnIssue, 'https://bitbucket.org/atlassianlabs/atlascode/issues?status=new&status=open'],
    [KnownLinkID.WhatIsJQL, 'https://www.atlassian.com/blog/jira-software/jql-the-most-flexible-way-to-search-jira-14'],
    [KnownLinkID.Contribute, 'https://bitbucket.org/atlassianlabs/atlascode/src/devel/'],
]);

export interface FeedbackData {
    type: FeedbackType;
    description: string;
    canBeContacted: boolean;
    userName: string;
    emailAddress: string;
    source: string;
}

export interface FeedbackUser {
    userName: string;
    emailAddress: string;
}

export const emptyFeedbackUser: FeedbackUser = {
    userName: '',
    emailAddress: '',
};

export enum PMFLevel {
    VERY = 'Very disappointed',
    SOMEWHAT = 'Somewhat disappointed',
    NOT = 'Not disappointed',
}

export function numForPMFLevel(level: PMFLevel): string {
    switch (level) {
        case PMFLevel.VERY: {
            return '0';
        }
        case PMFLevel.SOMEWHAT: {
            return '1';
        }
        case PMFLevel.NOT: {
            return '3';
        }
    }
}
export interface PMFData {
    level: PMFLevel;
    improvements: string;
    alternative: string;
    benefits: string;
}
