import { AxiosInstance } from 'axios';
import { BitbucketResponseHandler } from './responseHandlers/BitbucketResponseHandler';
import { JiraPKCEResponseHandler } from './responseHandlers/JiraPKCEResponseHandler';
import { OAuthProvider } from './authInfo';
import { ResponseHandler } from './responseHandlers/ResponseHandler';
import { Strategy } from './oldStrategy';

export function responseHandlerForStrategy(
    strategy: Strategy,
    agent: { [k: string]: any },
    axios: AxiosInstance
): ResponseHandler {
    if (strategy.provider() === OAuthProvider.JiraCloud || strategy.provider() === OAuthProvider.JiraCloudStaging) {
        return new JiraPKCEResponseHandler(strategy, agent, axios);
    }
    if (
        strategy.provider() === OAuthProvider.BitbucketCloud ||
        strategy.provider() === OAuthProvider.BitbucketCloudStaging
    ) {
        return new BitbucketResponseHandler(strategy, agent, axios);
    }
    throw new Error(`Unknown provider when creating response handler: ${strategy.provider()}`);
}
