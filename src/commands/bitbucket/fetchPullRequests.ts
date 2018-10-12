import { Logger } from "../../logger";
import { getPullRequestTitles } from "../../bitbucket/pullRequests";


export function fetchPullRequestsCommand() {
    getPullRequestTitles(this.repository).then(r => Logger.debug(r));
}
