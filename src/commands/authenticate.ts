import { OAuthProvider } from '../atlclients/authInfo';
import { Container } from '../container';
import { configuration, isStagingSite } from '../config/configuration';

export async function authenticateBitbucket() {
    authenticate(OAuthProvider.BitbucketCloud);
}

export async function authenticateBitbucketStaging() {
    authenticate(OAuthProvider.BitbucketCloudStaging);
}

export async function authenticateJira() {
    authenticate(OAuthProvider.JiraCloud);
}

export async function authenticateJiraStaging() {
    authenticate(OAuthProvider.JiraCloudStaging);
}

export async function clearBitbucketAuth() {
    clearAuth(OAuthProvider.BitbucketCloud);
    clearAuth(OAuthProvider.BitbucketCloudStaging);
}

export async function clearJiraAuth() {
    clearAuth(OAuthProvider.JiraCloud);
    if (!isStagingSite(Container.jiraSiteManager.effectiveSite)) {
        await configuration.setWorkingProject(undefined);
    }
}

export async function clearJiraAuthStaging() {
    clearAuth(OAuthProvider.JiraCloudStaging);
    if (isStagingSite(Container.jiraSiteManager.effectiveSite)) {
        await configuration.setWorkingProject(undefined);
    }
}

async function authenticate(provider: string) {
    Container.clientManager.userInitiatedOAuthLogin(provider);
}

async function clearAuth(provider: string) {
    await Container.clientManager.removeClient(provider);
    await Container.authManager.removeAuthInfo(provider);
}
