import { AuthProvider } from '../atlclients/authInfo';
import { Container } from '../container';

export async function authenticateBitbucket() {
    authenticate(AuthProvider.BitbucketCloud);
}

export async function authenticateJira() {
    authenticate(AuthProvider.JiraCloud);
}

export async function clearBitbucketAuth() {
    clearAuth(AuthProvider.BitbucketCloud);
}

export async function clearJiraAuth() {
    clearAuth(AuthProvider.JiraCloud);
}

async function authenticate(provider:string) {
    await Container.clientManager.authenticate(provider);
}

async function clearAuth(provider:string) {
    await Container.clientManager.removeClient(provider);
    await Container.authManager.removeAuthInfo(provider);
}
