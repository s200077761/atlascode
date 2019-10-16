import { Container } from '../container';
import { SiteInfo, AuthInfo } from '../atlclients/authInfo';


export async function authenticateCloud(site: SiteInfo) {
    Container.loginManager.userInitiatedOAuthLogin(site);
}

export async function authenticateServer(site: SiteInfo, authInfo: AuthInfo) {
    return await Container.loginManager.userInitiatedServerLogin(site, authInfo);
}

export async function clearAuth(site: SiteInfo) {
    await Container.clientManager.removeClient(site);
    Container.siteManager.removeSite(site);
}
