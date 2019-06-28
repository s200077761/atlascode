import { PullRequestApi } from "./model";
import { ServerPullRequestApi } from "../bitbucket-server/pullRequests";
import { CloudPullRequestApi } from "./pullRequests";
import { Repository, Remote } from "../typings/git";
import { siteDetailsForRepository, siteDetailsForRemote } from "./bbUtils";

class PullRequestProviderImpl {
    private serverApi: PullRequestApi = new ServerPullRequestApi();
    private cloudApi: PullRequestApi = new CloudPullRequestApi();

    forRepository(repo: Repository): PullRequestApi {
        const site = siteDetailsForRepository(repo);
        if (site && site.isCloud) {
            return this.cloudApi;
        }

        return this.serverApi;
    }

    forRemote(remote: Remote): PullRequestApi {
        const site = siteDetailsForRemote(remote);
        if (site && site.isCloud) {
            return this.cloudApi;
        }

        return this.serverApi;
    }
}

export const PullRequestProvider = new PullRequestProviderImpl();