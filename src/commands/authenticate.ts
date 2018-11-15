import { OAuthDancer } from '../atlclients/oauthDancer';
import * as authinfo from '../atlclients/authInfo';
import { Logger } from '../logger';
import { Container } from '../container';

export async function authenticateBitbucket() {
    await clearBitbucketAuth();
    authenticate(authinfo.AuthProvider.BitbucketCloud);
}

export async function authenticateJira() {
    await clearJiraAuth
    authenticate(authinfo.AuthProvider.JiraCloud);
}

export async function clearBitbucketAuth() {
    clearAuth(authinfo.AuthProvider.BitbucketCloud);
}

export async function clearJiraAuth() {
    clearAuth(authinfo.AuthProvider.JiraCloud);
}

async function authenticate(provider:string) {
    let info:authinfo.AuthInfo | undefined;
    let dancer = new OAuthDancer();
    dancer.doDance(provider).then(authInfo => {
        if (authInfo) {
            info = authInfo;
            Container.authManager.saveAuthInfo(provider,info);
        }
    });

    if (info) {
        Logger.debug("got user: " + info.user.displayName);
    }
}

async function clearAuth(provider:string) {
    await Container.clientManager.removeClient(provider);
    await Container.authManager.removeAuthInfo(provider);
}
