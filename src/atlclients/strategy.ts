import { OAuthProvider } from './authInfo';

export const JiraProdStrategy = {
    clientID: 'bJChVgBQd0aNUPuFZ8YzYBVZz3X4QTe2',
    clientSecret: 'P0sl4EwwnXUHZoZgMLi2G6jzeCS1rRI8-w8X0kPf6A1XXQRC5_-F252BhbxgeI3b',
    authorizationURL: 'https://auth.atlassian.com/authorize',
    tokenURL: 'https://auth.atlassian.com/oauth/token',
    profileURL: 'https://api.atlassian.com/me',
    accessibleResourcesURL: 'https://api.atlassian.com/oauth/token/accessible-resources',
    callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.JiraCloud,
    scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
    authParams: {
        audience: 'api.atlassian.com',
        prompt: 'consent',
    },
};

export const JiraStagingStrategy = {
    clientID: 'pmzXmUav3Rr5XEL0Sie7Biec0WGU8BKg',
    clientSecret: 'u8PPS8h23z5575nWvy5fsI77J1UBw1J-IlvTgfZXV9mibpXsQF9aJcbYf7e8yeSu',
    authorizationURL: 'https://auth.stg.atlassian.com/authorize',
    tokenURL: 'https://auth.stg.atlassian.com/oauth/token',
    profileURL: 'https://api.stg.atlassian.com/me',
    accessibleResourcesURL: 'https://api.stg.atlassian.com/oauth/token/accessible-resources',
    callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.JiraCloudStaging,
    scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
    authParams: {
        audience: 'api.stg.atlassian.com',
        prompt: 'consent',
    },
};

export const BitbucketProdStrategy = {
    clientID: '3hasX42a7Ugka2FJja',
    clientSecret: 'st7a4WtBYVh7L2mZMU8V5ehDtvQcWs9S',
    authorizationURL: 'https://bitbucket.org/site/oauth2/authorize',
    tokenURL: 'https://bitbucket.org/site/oauth2/access_token',
    profileURL: 'https://api.bitbucket.org/2.0/user',
    emailsURL: 'https://api.bitbucket.org/2.0/user/emails',
    callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.BitbucketCloud
};

export const BitbucketStagingStrategy = {
    clientID: '7jspxC7fgemuUbnWQL',
    clientSecret: 'sjHugFh6SVVshhVE7PUW3bgXbbQDVjJD',
    authorizationURL: 'https://staging.bb-inf.net/site/oauth2/authorize',
    tokenURL: 'https://staging.bb-inf.net/site/oauth2/access_token',
    profileURL: 'https://api-staging.bb-inf.net/2.0/user',
    emailsURL: 'https://api-staging.bb-inf.net/2.0/user/emails',
    callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.BitbucketCloudStaging,
};