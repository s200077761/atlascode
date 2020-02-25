import { AuthInfo, DetailedSiteInfo, SiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';

export async function authenticateCloud(site: SiteInfo, callback: string) {
    Container.loginManager.userInitiatedOAuthLogin(site, callback);
}

export async function authenticateServer(site: SiteInfo, authInfo: AuthInfo) {
    return await Container.loginManager.userInitiatedServerLogin(site, authInfo);
}

export async function clearAuth(site: DetailedSiteInfo) {
    await Container.clientManager.removeClient(site);
    Container.siteManager.removeSite(site);
}
