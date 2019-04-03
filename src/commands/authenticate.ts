import { AuthProvider } from '../atlclients/authInfo';
import { Container } from '../container';
import { configuration, isStagingSite } from '../config/configuration';
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
    if (!isStagingSite(Container.jiraSiteManager.effectiveSite)) {
        await configuration.updateEffective(JiraWorkingProjectConfigurationKey, undefined);
    }
}

export async function clearJiraAuthStaging() {
    clearAuth(AuthProvider.JiraCloudStaging);
    if (isStagingSite(Container.jiraSiteManager.effectiveSite)) {
        await configuration.updateEffective(JiraWorkingProjectConfigurationKey, undefined);
    }
}

async function authenticate(provider: string) {
    await Container.clientManager.authenticate(provider);
}

async function clearAuth(provider: string) {
    await Container.clientManager.removeClient(provider);
    await Container.authManager.removeAuthInfo(provider);
}
