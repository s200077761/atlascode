import { OAuthDancer } from '../atlclients/oauthDancer';
import * as authinfo from '../atlclients/authInfo';
import { Logger } from '../logger';
import { AuthStore } from '../atlclients/authStore';

export async function authenticateBitbucket() {
    let info:authinfo.AuthInfo | undefined;
    Logger.debug("checking auth store...");
    await AuthStore.getAuthInfo(authinfo.AuthProvider.BitbucketCloud).then(authInfo => {
        if (authInfo) {
            info = authInfo;
        } else {
            Logger.debug("starting oauth...");
            let dancer = new OAuthDancer();
            dancer.doDance(authinfo.AuthProvider.BitbucketCloud).then(authInfo => {
                if (authInfo) {
                    info = authInfo;
                    AuthStore.saveAuthInfo(authinfo.AuthProvider.BitbucketCloud,info);
                }
            });
        }
    });

    if (info) {
        Logger.debug("got user: " + info.user.displayName);
    }
}

export async function authenticateJira() {
    let info:authinfo.AuthInfo | undefined;
    Logger.debug("checking auth store...");
    await AuthStore.getAuthInfo(authinfo.AuthProvider.JiraCloud).then(authInfo => {
        if (authInfo) {
            info = authInfo;
        } else {
            Logger.debug("starting oauth...");
            let dancer = new OAuthDancer();
            dancer.doDance(authinfo.AuthProvider.JiraCloud).then(authInfo => {
                if (authInfo) {
                    info = authInfo;
                    AuthStore.saveAuthInfo(authinfo.AuthProvider.JiraCloud,info);
                }
            });
        }
    });

    if (info) {
        Logger.debug("got user: " + info.user.displayName);
    }
}
