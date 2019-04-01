import { AuthProvider } from '../atlclients/authInfo';
import { Container } from '../container';
import { configuration } from '../config/configuration';
import { JiraWorkingProjectConfigurationKey } from '../constants';

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
    clearAuth(AuthProvider.JiraCloudStaging);
    await configuration.updateEffective(JiraWorkingProjectConfigurationKey, undefined);
}

async function authenticate(provider: string) {
    await Container.clientManager.authenticate(provider);
}

async function clearAuth(provider: string) {
    await Container.clientManager.removeClient(provider);
    await Container.authManager.removeAuthInfo(provider);
}
