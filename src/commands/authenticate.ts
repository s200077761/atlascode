import { Container } from '../container';
import { SiteInfo, AuthInfo } from '../atlclients/authInfo';



export async function authenticateCloud(site: SiteInfo) {
    Container.clientManager.userInitiatedOAuthLogin(site);
}

export async function authenticateServer(site: SiteInfo, authInfo: AuthInfo) {
    return await Container.clientManager.userInitiatedServerLogin(site, authInfo);
}

export async function clearAuth(site: SiteInfo) {
    await Container.clientManager.removeClient(site);
    await Container.authManager.removeAuthInfo(site);

    //just in case
    await Container.siteManager.removeSite(site);
}
