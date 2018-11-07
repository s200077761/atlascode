import { Logger } from "../../logger";
import { PullRequestApi } from "../../bitbucket/pullRequests";
import { BitbucketContext } from "../../bitbucket/context";


export async function fetchPullRequestsCommand(this: BitbucketContext) {
    let prTitles = await PullRequestApi.getTitles(this.repository);
    Logger.debug(prTitles);
}
