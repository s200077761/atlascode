import { SiteInfo, ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { Container } from '../container';

export async function authenticateBitbucket() {
    const site: SiteInfo = {
        hostname: 'bitbucket.org',
        product: ProductBitbucket
    };
    authenticate(site);
}

export async function authenticateBitbucketStaging() {

}

export async function authenticateJira() {
    const site: SiteInfo = {
        hostname: 'atlassian.net',
        product: ProductJira
    };
    authenticate(site);
}

export async function authenticateJiraStaging() {

}

export async function clearBitbucketAuth() {
    const site: SiteInfo = {
        hostname: 'bitbucket.org',
        product: ProductBitbucket
    };
    clearAuth(site);

}

export async function clearJiraAuth() {

}

export async function clearJiraAuthStaging() {

}

async function authenticate(site: SiteInfo) {
    Container.clientManager.userInitiatedOAuthLogin(site);
}

async function clearAuth(site: SiteInfo) {
    await Container.clientManager.removeClient(site);
    await Container.authManager.removeAuthInfo(site);
}
