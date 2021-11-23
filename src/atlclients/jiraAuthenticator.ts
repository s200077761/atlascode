import { getProxyHostAndPort } from '@atlassianlabs/pi-client-common';
import { AxiosInstance } from 'axios';
import crypto from 'crypto';
import * as vscode from 'vscode';
import { Logger } from '../logger';
import { Authenticator, Tokens } from './authenticator';
import {
    AccessibleResource,
    DetailedSiteInfo,
    OAuthProvider,
    oauthProviderForSite,
    OAuthResponse,
    ProductJira,
    SiteInfo,
    UserInfo,
} from './authInfo';
import { CredentialManager } from './authStore';
import { JiraProdStrategy, JiraStagingStrategy } from './strategy';

export class JiraAuthentictor implements Authenticator {
    private activeCodes: Map<string, string> = new Map();

    constructor(private axios: AxiosInstance) {}

    public startAuthentication(state: string, site: SiteInfo) {
        const provider = oauthProviderForSite(site)!;
        const strategy = provider === OAuthProvider.JiraCloud ? JiraProdStrategy : JiraStagingStrategy;
        const verifier = this.verifier();
        this.activeCodes.set(state, verifier);
        const url = this.constructUrl(strategy, state, verifier);
        vscode.env.openExternal(vscode.Uri.parse(url));
    }

    public async getTokens(state: string, strategy: any, code: string, agent: { [k: string]: any }): Promise<Tokens> {
        try {
            const [proxyHost, proxyPort] = getProxyHostAndPort();
            if (proxyHost.trim() !== '') {
                Logger.debug(`using proxy: ${proxyHost}:${proxyPort}`);
            } else {
                Logger.debug(`no proxy configured in environment`);
            }

            const codeVerifier = this.activeCodes.get(state);

            const tokenResponse = await this.axios(strategy.tokenURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: strategy.callbackURL,
                    client_id: strategy.clientID,
                    code_verifier: codeVerifier,
                }),
                ...agent,
            });

            const data = tokenResponse.data;
            return { accessToken: data.access_token, refreshToken: data.refresh_token };
        } catch (err) {
            const data = err.response.data;
            const newErr = new Error(`Error fetching Jira tokens: ${err}
            
            Response: ${JSON.stringify(data ?? {})}`);
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
        const strategy = provider === OAuthProvider.JiraCloud ? JiraProdStrategy : JiraStagingStrategy;
        const tokens = await this.getTokens(state, strategy, code, agent);
        const accessibleResources = await this.getResources(strategy, tokens.accessToken, agent);
        if (accessibleResources.length > 0) {
            const user = await this.getUser(provider, tokens.accessToken, accessibleResources[0], agent);
            return {
                access: tokens.accessToken,
                refresh: tokens.refreshToken,
                receivedAt: Date.now(),
                user: user,
                accessibleResources: accessibleResources,
            };
        } else {
            throw new Error(`No accessible resources found for ${provider}`);
        }
    }

    public async getOAuthSiteDetails(
        provider: OAuthProvider,
        userId: string,
        resources: AccessibleResource[]
    ): Promise<DetailedSiteInfo[]> {
        let newSites: DetailedSiteInfo[] = [];

        let apiUri = provider === OAuthProvider.JiraCloudStaging ? 'api.stg.atlassian.com' : 'api.atlassian.com';

        //TODO: [VSCODE-505] call serverInfo endpoint when it supports OAuth
        //const baseUrlString = await getJiraCloudBaseUrl(`https://${apiUri}/ex/jira/${newResource.id}/rest/2`, authInfo.access);

        newSites = resources.map((r) => {
            const credentialId = CredentialManager.generateCredentialId(r.id, userId);

            return {
                avatarUrl: r.avatarUrl,
                baseApiUrl: `https://${apiUri}/ex/jira/${r.id}/rest`,
                baseLinkUrl: r.url,
                host: new URL(r.url).host,
                id: r.id,
                name: r.name,
                product: ProductJira,
                isCloud: true,
                userId: userId,
                credentialId: credentialId,
            };
        });

        return newSites;
    }

    private constructUrl(strategy: any, state: string, verifier: string): string {
        const codeChallenge = this.base64URLEncode(this.sha256(verifier));
        const params = new URLSearchParams();
        params.append('client_id', strategy.clientID);
        params.append('redirect_uri', strategy.callbackURL);
        params.append('response_type', 'code');
        params.append('scope', strategy.scope);
        params.append('audience', strategy.authParams.audience);
        params.append('prompt', strategy.authParams.prompt);
        params.append('state', state);
        params.append('code_challenge', codeChallenge);
        params.append('code_challenge_method', 'S256');
        return strategy.authorizationURL + '?' + params.toString();
    }

    private async getUser(
        provider: OAuthProvider,
        accessToken: string,
        resource: AccessibleResource,
        agent: { [k: string]: any }
    ): Promise<UserInfo> {
        try {
            let apiUri = provider === OAuthProvider.JiraCloudStaging ? 'api.stg.atlassian.com' : 'api.atlassian.com';
            const url = `https://${apiUri}/ex/jira/${resource.id}/rest/api/2/myself`;

            const userResponse = await this.axios(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                ...agent,
            });

            const data = userResponse.data;

            return {
                id: data.accountId,
                displayName: data.displayName,
                email: data.emailAddress,
                avatarUrl: data.avatarUrls['48x48'],
            };
        } catch (err) {
            const newErr = new Error(`Error fetching Jira user: ${err}`);
            Logger.error(newErr);
            throw newErr;
        }
    }

    private async getResources(
        strategy: any,
        accessToken: string,
        agent: { [k: string]: any }
    ): Promise<AccessibleResource[]> {
        try {
            const resources: AccessibleResource[] = [];

            const resourcesResponse = await this.axios(strategy.accessibleResourcesURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                ...agent,
            });

            resourcesResponse.data.forEach((resource: AccessibleResource) => {
                resources.push(resource);
            });

            return resources;
        } catch (err) {
            const newErr = new Error(`Error fetching Jira resources: ${err}`);
            Logger.error(newErr);
            throw newErr;
        }
    }

    private base64URLEncode(str: Buffer): string {
        return str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    private verifier(): string {
        return this.base64URLEncode(crypto.randomBytes(32));
    }

    private sha256(buffer: any) {
        return crypto.createHash('sha256').update(buffer).digest();
    }
}
