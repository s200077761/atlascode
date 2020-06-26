import { AccessibleResource, DetailedSiteInfo, OAuthProvider, OAuthResponse, SiteInfo } from './authInfo';

export interface Tokens {
    accessToken: string;
    refreshToken: string;
}

export abstract class Authenticator {
    public abstract startAuthentication(state: string, site: SiteInfo): void;

    public abstract async exchangeCode(
        provider: OAuthProvider,
        state: string,
        code: string,
        agent: { [k: string]: any }
    ): Promise<OAuthResponse>;

    public abstract async getOAuthSiteDetails(
        provider: OAuthProvider,
        userId: string,
        resources: AccessibleResource[]
    ): Promise<DetailedSiteInfo[]>;
}
