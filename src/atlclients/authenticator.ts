import { AccessibleResource, DetailedSiteInfo, OAuthProvider, OAuthResponse, SiteInfo } from './authInfo';

export interface Tokens {
    accessToken: string;
    refreshToken: string;
}

/**
 * Authenticator encapsulates the information needed to authenticate with an OAuth service.
 */

export interface Authenticator {
    /**
     * This starts the authentication processs. It will open a browser window to the appropriate auth service. When
     * the user has authenticated with that service the browser will be redirected to the Atlascode auth service (or
     * auth service running on the user's machine) where the app redirect URI will be decoded and the user will be
     * redirect to VS Code or some equivalent.
     * @param state The state parameter for the OAuth dance. To work with the Atlascode auth service this should be a
     * UUID followed by "::" followed by the app URI to be redirect to as the last redirect in the OAuth process.
     * @param site The site being authenticated with.
     */
    startAuthentication(state: string, site: SiteInfo): void;

    /**
     * When the final redirect to the application happens this method should be called to exchanged the bearer token for
     * an access and refresh token.
     * @param provider The OAuth provider for the site.
     * @param state The state parameter for the OAuth process. This will be the same as the value provided to
     * startAuthentication.
     * @param code The bearer token returned in the redirect.
     * @param agent The agent to use during the code exchange.
     */
    exchangeCode(
        provider: OAuthProvider,
        state: string,
        code: string,
        agent: { [k: string]: any }
    ): Promise<OAuthResponse>;

    getOAuthSiteDetails(
        provider: OAuthProvider,
        userId: string,
        resources: AccessibleResource[]
    ): Promise<DetailedSiteInfo[]>;
}
