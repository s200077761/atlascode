import { AuthProvider } from '../atlclients/authInfo';
import { Container } from '../container';
import { configuration, isStagingSite } from '../config/configuration';

export async function authenticateBitbucket() {
    authenticate(AuthProvider.BitbucketCloud);
}

export async function authenticateBitbucketStaging() {
    authenticate(AuthProvider.BitbucketCloudStaging);
}

export async function authenticateJira() {
    authenticate(AuthProvider.JiraCloud);
}

export async function authenticateJiraStaging() {
    authenticate(AuthProvider.JiraCloudStaging);
}

export async function clearBitbucketAuth() {
    clearAuth(AuthProvider.BitbucketCloud);
    clearAuth(AuthProvider.BitbucketCloudStaging);
}

export async function clearJiraAuth() {
    clearAuth(AuthProvider.JiraCloud);
    if (!isStagingSite(Container.jiraSiteManager.effectiveSite)) {
        await configuration.setWorkingProject(undefined);
    }
}

export async function clearJiraAuthStaging() {
    clearAuth(AuthProvider.JiraCloudStaging);
    if (isStagingSite(Container.jiraSiteManager.effectiveSite)) {
        await configuration.setWorkingProject(undefined);
    }
}

async function authenticate(provider: string) {
    Container.clientManager.userInitiatedLogin(provider);
}

async function clearAuth(provider: string) {
    await Container.clientManager.removeClient(provider);
    await Container.authManager.removeAuthInfo(provider);
}
