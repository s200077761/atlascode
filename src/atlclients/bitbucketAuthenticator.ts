import { AxiosInstance } from 'axios';
import * as vscode from 'vscode';
import { Logger } from '../logger';
import { Authenticator, Tokens } from './authenticator';
import {
    AccessibleResource,
    DetailedSiteInfo,
    OAuthProvider,
    oauthProviderForSite,
    OAuthResponse,
    ProductBitbucket,
    SiteInfo,
    UserInfo,
} from './authInfo';
import { CredentialManager } from './authStore';
import { BitbucketProdStrategy, BitbucketStagingStrategy } from './strategy';

export class BitbucketAuthenticator implements Authenticator {
    constructor(private axios: AxiosInstance) {}

    public startAuthentication(state: string, site: SiteInfo) {
        const provider = oauthProviderForSite(site);
        const strategy = provider === OAuthProvider.BitbucketCloud ? BitbucketProdStrategy : BitbucketStagingStrategy;

        const url = new URL(strategy.authorizationURL);
        url.searchParams.append('client_id', strategy.clientID);
        url.searchParams.append('response_type', 'code');
        url.searchParams.append('state', state);

        vscode.env.openExternal(vscode.Uri.parse(url.toString()));
    }

    public async getTokens(strategy: any, code: string, agent: { [k: string]: any }): Promise<Tokens> {
        try {
            const basicAuth = Buffer.from(`${strategy.clientID}:${strategy.clientSecret}`).toString('base64');

            const tokenResponse = await this.axios(strategy.tokenURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${basicAuth}`,
                },
                data: `grant_type=authorization_code&code=${code}`,
                ...agent,
            });

            const data = tokenResponse.data;
            return { accessToken: data.access_token, refreshToken: data.refresh_token };
        } catch (err) {
            const newErr = new Error(`Error fetching Bitbucket tokens: ${err}`);
            Logger.error(newErr);
            throw newErr;
        }
    }

    public async exchangeCode(
        provider: OAuthProvider,
        state: string,
        code: string,
        agent: { [k: string]: any }
    ): Promise<OAuthResponse> {
        let strategy = BitbucketProdStrategy;
        let accessibleResources: AccessibleResource[] = [];

        if (provider === OAuthProvider.BitbucketCloud) {
            accessibleResources.push({
                id: OAuthProvider.BitbucketCloud,
                name: ProductBitbucket.name,
                scopes: [],
                avatarUrl: '',
                url: 'https://bitbucket.org',
            });
        } else {
            strategy = BitbucketStagingStrategy;
            accessibleResources.push({
                id: OAuthProvider.BitbucketCloudStaging,
                name: ProductBitbucket.name,
                scopes: [],
                avatarUrl: '',
                url: 'https://staging.bb-inf.net',
            });
        }

        const tokens = await this.getTokens(strategy, code, agent);
        const user = await this.getUser(strategy, tokens.accessToken, agent);

        return {
            access: tokens.accessToken,
            refresh: tokens.refreshToken,
            receivedAt: Date.now(),
            user: user,
            accessibleResources: accessibleResources,
        };
    }

    public async getOAuthSiteDetails(
        provider: OAuthProvider,
        userId: string,
        resources: AccessibleResource[]
    ): Promise<DetailedSiteInfo[]> {
        let newSites: DetailedSiteInfo[] = [];

        if (resources.length > 0) {
            let resource = resources[0];
            const hostname = provider === OAuthProvider.BitbucketCloud ? 'bitbucket.org' : 'staging.bb-inf.net';
            const baseApiUrl =
                provider === OAuthProvider.BitbucketCloud
                    ? 'https://api.bitbucket.org/2.0'
                    : 'https://api-staging.bb-inf.net/2.0';
            const siteName = provider === OAuthProvider.BitbucketCloud ? 'Bitbucket Cloud' : 'Bitbucket Staging Cloud';

            const credentialId = CredentialManager.generateCredentialId(resource.id, userId);

            // TODO: [VSCODE-496] find a way to embed and link to a bitbucket icon
            newSites = [
                {
                    avatarUrl: '',
                    baseApiUrl: baseApiUrl,
                    baseLinkUrl: resource.url,
                    host: hostname,
                    id: resource.id,
                    name: siteName,
                    product: ProductBitbucket,
                    isCloud: true,
                    userId: userId,
                    credentialId: credentialId,
                },
            ];
        }

        return newSites;
    }

    private async getUser(strategy: any, accessToken: string, agent: { [k: string]: any }): Promise<UserInfo> {
        try {
            const userResponse = await this.axios(strategy.profileURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                ...agent,
            });

            let email = 'do-not-reply@atlassian.com';
            try {
                const emailsResponse = await this.axios(strategy.emailsURL, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    ...agent,
                });

                if (Array.isArray(emailsResponse.data.values) && emailsResponse.data.values.length > 0) {
                    const primary = emailsResponse.data.values.filter((val: any) => val.is_primary);
                    if (primary.length > 0) {
                        email = primary[0].email;
                    }
                }
            } catch (e) {
                //ignore
            }

            const userData = userResponse.data;

            return {
                id: userData.account_id,
                displayName: userData.display_name,
                email: email,
                avatarUrl: userData.links.avatar.href,
            };
        } catch (err) {
            const newErr = new Error(`Error fetching Bitbucket user: ${err}`);
            Logger.error(newErr);
            throw newErr;
        }
    }
}
