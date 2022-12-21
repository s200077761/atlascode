import { OAuthProvider } from './authInfo';
import crypto from 'crypto';

const NewJiraProdStrategyData = {
    clientID: 'UV2010EkKxO7GZ7zxZ8Swm9Rn4M5K0Eh',
    clientSecret: '',
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

const NewJiraStagingStrategyData = {
    clientID: 'gtv5kAPJtJRQOvF7bepAh9rOUnZWTv3E',
    clientSecret: '',
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

const BitbucketProdStrategyData = {
    clientID: '3hasX42a7Ugka2FJja',
    clientSecret: 'st7a4WtBYVh7L2mZMU8V5ehDtvQcWs9S',
    authorizationURL: 'https://bitbucket.org/site/oauth2/authorize',
    tokenURL: 'https://bitbucket.org/site/oauth2/access_token',
    profileURL: 'https://api.bitbucket.org/2.0/user',
    emailsURL: 'https://api.bitbucket.org/2.0/user/emails',
    callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.BitbucketCloud,
};

const BitbucketStagingStrategyData = {
    clientID: '7jspxC7fgemuUbnWQL',
    clientSecret: 'sjHugFh6SVVshhVE7PUW3bgXbbQDVjJD',
    authorizationURL: 'https://staging.bb-inf.net/site/oauth2/authorize',
    tokenURL: 'https://staging.bb-inf.net/site/oauth2/access_token',
    profileURL: 'https://api-staging.bb-inf.net/2.0/user',
    emailsURL: 'https://api-staging.bb-inf.net/2.0/user/emails',
    callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.BitbucketCloudStaging,
};

export function strategyForProvider(provider: OAuthProvider): Strategy {
    switch (provider) {
        case OAuthProvider.JiraCloud: {
            return new PKCEJiraProdStrategy();
        }
        case OAuthProvider.JiraCloudStaging: {
            return new PKCEJiraStagingStrategy();
        }
        case OAuthProvider.BitbucketCloud: {
            return new BitbucketProdStrategy();
        }
        case OAuthProvider.BitbucketCloudStaging: {
            return new BitbucketStagingStrategy();
        }
    }
}

export abstract class Strategy {
    public abstract provider(): OAuthProvider;
    public abstract authorizeUrl(state: string): string;
    public abstract accessibleResourcesUrl(): string;
    public abstract tokenAuthorizationData(code: string): string;
    public abstract tokenUrl(): string;
    public abstract apiUrl(): string;
    public abstract refreshHeaders(): any;
    public abstract tokenRefreshData(refreshToken: string): string;
    public profileUrl(): string {
        return '';
    }
    public emailsUrl(): string {
        return '';
    }
}

class PKCEJiraProdStrategy extends Strategy {
    private verifier: string;

    public constructor() {
        super();
        this.verifier = base64URLEncode(crypto.randomBytes(32));
    }

    public provider(): OAuthProvider {
        return OAuthProvider.JiraCloud;
    }

    public authorizeUrl(state: string): string {
        const codeChallenge = base64URLEncode(sha256(this.verifier));
        const params = new URLSearchParams();
        params.append('client_id', NewJiraProdStrategyData.clientID);
        params.append('redirect_uri', NewJiraProdStrategyData.callbackURL);
        params.append('response_type', 'code');
        params.append('scope', NewJiraProdStrategyData.scope);
        params.append('audience', NewJiraProdStrategyData.authParams.audience);
        params.append('prompt', NewJiraProdStrategyData.authParams.prompt);
        params.append('state', state);
        params.append('code_challenge', codeChallenge);
        params.append('code_challenge_method', 'S256');
        return NewJiraProdStrategyData.authorizationURL + '?' + params.toString();
    }

    public accessibleResourcesUrl(): string {
        return NewJiraProdStrategyData.accessibleResourcesURL;
    }

    public tokenUrl(): string {
        return NewJiraProdStrategyData.tokenURL;
    }

    public apiUrl(): string {
        return 'api.atlassian.com';
    }

    public refreshHeaders() {
        return {
            'Content-Type': 'application/json',
        };
    }

    public tokenAuthorizationData(code: string): string {
        const data = JSON.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: NewJiraProdStrategyData.callbackURL,
            client_id: NewJiraProdStrategyData.clientID,
            code_verifier: this.verifier,
        });
        return data;
    }

    public tokenRefreshData(refreshToken: string): string {
        const dataString = JSON.stringify({
            grant_type: 'refresh_token',
            client_id: NewJiraProdStrategyData.clientID,
            refresh_token: refreshToken,
        });
        return dataString;
    }
}

function base64URLEncode(str: Buffer): string {
    return str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function sha256(buffer: any) {
    return crypto.createHash('sha256').update(buffer).digest();
}

class PKCEJiraStagingStrategy extends Strategy {
    private verifier: string;

    public constructor() {
        super();
        this.verifier = base64URLEncode(crypto.randomBytes(32));
    }

    public provider(): OAuthProvider {
        return OAuthProvider.JiraCloudStaging;
    }

    public authorizeUrl(state: string) {
        const codeChallenge = base64URLEncode(sha256(this.verifier));
        const params = new URLSearchParams();
        params.append('client_id', NewJiraStagingStrategyData.clientID);
        params.append('redirect_uri', NewJiraStagingStrategyData.callbackURL);
        params.append('response_type', 'code');
        params.append('scope', NewJiraStagingStrategyData.scope);
        params.append('audience', NewJiraStagingStrategyData.authParams.audience);
        params.append('prompt', NewJiraStagingStrategyData.authParams.prompt);
        params.append('state', state);
        params.append('code_challenge', codeChallenge);
        params.append('code_challenge_method', 'S256');

        return NewJiraStagingStrategyData.authorizationURL + '?' + params.toString();
    }

    public tokenUrl(): string {
        return NewJiraStagingStrategyData.tokenURL;
    }

    public apiUrl(): string {
        return 'api.stg.atlassian.com';
    }

    public accessibleResourcesUrl(): string {
        return NewJiraStagingStrategyData.accessibleResourcesURL;
    }

    public refreshHeaders() {
        return {
            'Content-Type': 'application/json',
        };
    }

    public tokenAuthorizationData(code: string): string {
        const data = JSON.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: NewJiraStagingStrategyData.callbackURL,
            client_id: NewJiraStagingStrategyData.clientID,
            code_verifier: this.verifier,
        });
        return data;
    }

    public tokenRefreshData(refreshToken: string): string {
        const dataString = JSON.stringify({
            grant_type: 'refresh_token',
            client_id: NewJiraStagingStrategyData.clientID,
            refresh_token: refreshToken,
        });
        return dataString;
    }
}

class BitbucketProdStrategy extends Strategy {
    public provider(): OAuthProvider {
        return OAuthProvider.BitbucketCloud;
    }

    public authorizeUrl(state: string): string {
        const url = new URL(BitbucketProdStrategyData.authorizationURL);
        url.searchParams.append('client_id', BitbucketProdStrategyData.clientID);
        url.searchParams.append('response_type', 'code');
        url.searchParams.append('state', state);

        return url.toString();
    }

    public accessibleResourcesUrl(): string {
        return '';
    }

    public tokenAuthorizationData(code: string): string {
        return `grant_type=authorization_code&code=${code}`;
    }

    public tokenUrl(): string {
        return BitbucketProdStrategyData.tokenURL;
    }

    public apiUrl(): string {
        return 'https://bitbucket.org';
    }

    // We kinda abuse refreshHeaders for bitbucket. Maybe have a authorizationHeaders as well? Just rename?
    public refreshHeaders() {
        const basicAuth = Buffer.from(
            `${BitbucketProdStrategyData.clientID}:${BitbucketProdStrategyData.clientSecret}`
        ).toString('base64');
        return {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
        };
    }

    public tokenRefreshData(refreshToken: string): string {
        return `grant_type=refresh_token&refresh_token=${refreshToken}`;
    }

    public profileUrl(): string {
        return BitbucketProdStrategyData.profileURL;
    }

    public emailsUrl(): string {
        return BitbucketProdStrategyData.emailsURL;
    }
}

class BitbucketStagingStrategy extends Strategy {
    public provider(): OAuthProvider {
        return OAuthProvider.BitbucketCloudStaging;
    }

    public authorizeUrl(state: string): string {
        const url = new URL(BitbucketStagingStrategyData.authorizationURL);
        url.searchParams.append('client_id', BitbucketStagingStrategyData.clientID);
        url.searchParams.append('response_type', 'code');
        url.searchParams.append('state', state);

        return url.toString();
    }

    public accessibleResourcesUrl(): string {
        return '';
    }

    public tokenAuthorizationData(code: string): string {
        return `grant_type=authorization_code&code=${code}`;
    }

    public tokenUrl(): string {
        return BitbucketStagingStrategyData.tokenURL;
    }

    public apiUrl(): string {
        return 'https://staging.bb-inf.net';
    }

    public refreshHeaders() {
        const basicAuth = Buffer.from(
            `${BitbucketStagingStrategyData.clientID}:${BitbucketStagingStrategyData.clientSecret}`
        ).toString('base64');
        return {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
        };
    }

    public tokenRefreshData(refreshToken: string): string {
        return `grant_type=refresh_token&refresh_token=${refreshToken}`;
    }

    public profileUrl(): string {
        return BitbucketStagingStrategyData.profileURL;
    }

    public emailsUrl(): string {
        return BitbucketStagingStrategyData.emailsURL;
    }
}
