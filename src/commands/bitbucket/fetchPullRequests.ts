import { Logger } from "../../logger";
import { PullRequest } from "../../bitbucket/pullRequests";
import { BitbucketContext } from "../../bitbucket/context";


export async function fetchPullRequestsCommand(this: BitbucketContext) {
    let prTitles = await PullRequest.getPullRequestTitles(this.repository);
    Logger.debug(prTitles);
}
