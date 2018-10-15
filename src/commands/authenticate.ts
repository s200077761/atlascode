import { OAuthDancer } from '../atlclients/oauthDancer';
import { Logger } from '../logger';

export function authenticateBitbucket() {
    Logger.debug("starting oauth dance...");
    let dancer = new OAuthDancer();
    dancer.doDance('bitbucket').then(authInfo => {
        Logger.debug("GOT AUTH INFO");
        Logger.debug("got user" + authInfo.user.displayName);
    });
}

export function authenticateJira() {
    Logger.info("starting oauth dance...");
    let dancer = new OAuthDancer();
    dancer.doDance('jira').then(authInfo => {
        Logger.debug("GOT AUTH INFO");
        Logger.debug("got user: " + authInfo.user.displayName);
    });
}
