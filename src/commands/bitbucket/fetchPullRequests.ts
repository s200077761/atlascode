import { Logger } from "../../logger";
import { getPullRequestTitles } from "../../bitbucket/pullRequests";
import { BitbucketContext } from "../../bitbucket/context";


export function fetchPullRequestsCommand(this: BitbucketContext) {
    getPullRequestTitles(this.repository).then(r => Logger.debug(r));
}
