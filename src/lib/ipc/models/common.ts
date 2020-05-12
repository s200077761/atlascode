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
    ConfigWebview = 'atlascodeSettings',
    OnboardingWebview = 'atlascodeOnboarding',
    WelcomeWebview = 'atlascodeWelcomeScreen',
    StartWork = 'startWork',
}

export enum KnownLinkID {
    AtlascodeRepo = 'atlascodeRepoLink',
    AtlascodeIssues = 'atlascodeIssuesLink',
    AtlascodeDocs = 'atlascodeDocsLink',
    Integrations = 'integrationsLink',
}

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
