import { OAuthProvider } from './authInfo';

const authServer = 'https://atlascode-oauth-service.services.atlassian.com/';

export const JiraProdStrategy = {
    clientID: 'UV2010EkKxO7GZ7zxZ8Swm9Rn4M5K0Eh',
    clientSecret: '',
    authorizationURL: 'https://auth.atlassian.com/authorize',
    tokenURL: 'https://auth.atlassian.com/oauth/token',
    profileURL: 'https://api.atlassian.com/me',
    accessibleResourcesURL: 'https://api.atlassian.com/oauth/token/accessible-resources',
    callbackURL: authServer + OAuthProvider.JiraCloud,
    scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
    authParams: {
        audience: 'api.atlassian.com',
        prompt: 'consent',
    },
};

export const JiraStagingStrategy = {
    clientID: 'gtv5kAPJtJRQOvF7bepAh9rOUnZWTv3E',
    clientSecret: '',
    authorizationURL: 'https://auth.stg.atlassian.com/authorize',
    tokenURL: 'https://auth.stg.atlassian.com/oauth/token',
    profileURL: 'https://api.stg.atlassian.com/me',
    accessibleResourcesURL: 'https://api.stg.atlassian.com/oauth/token/accessible-resources',
    callbackURL: 'https://atlascode-oauth-service.ap-southeast-2.dev.atl-paas.net/' + OAuthProvider.JiraCloudStaging,
    scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
    authParams: {
        audience: 'api.stg.atlassian.com',
        prompt: 'consent',
    },
};

export const BitbucketProdStrategy = {
    clientID: 'XATKBvPrFbhLQXy8pM',
    clientSecret: '8u4FYhkNyxYPHQf3yQKGGtYqPk3tLxTD',
    authorizationURL: 'https://bitbucket.org/site/oauth2/authorize',
    tokenURL: 'https://bitbucket.org/site/oauth2/access_token',
    profileURL: 'https://api.bitbucket.org/2.0/user',
    emailsURL: 'https://api.bitbucket.org/2.0/user/emails',
    callbackURL: authServer + OAuthProvider.BitbucketCloud,
};

export const BitbucketStagingStrategy = {
    clientID: 'chKuTNkZbHA54xGUU6',
    clientSecret: 'XhwPvRATeRNFW7MGGPUWAkY5zLb5LmB2',
    authorizationURL: 'https://staging.bb-inf.net/site/oauth2/authorize',
    tokenURL: 'https://staging.bb-inf.net/site/oauth2/access_token',
    profileURL: 'https://api-staging.bb-inf.net/2.0/user',
    emailsURL: 'https://api-staging.bb-inf.net/2.0/user/emails',
    callbackURL: authServer + OAuthProvider.BitbucketCloudStaging,
};
