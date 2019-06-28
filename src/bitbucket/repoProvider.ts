import { RepositoriesApi } from "./model";
import { Repository, Remote } from "../typings/git";
import { siteDetailsForRepository, siteDetailsForRemote } from "./bbUtils";
import { ServerRepositoriesApi } from "../bitbucket-server/repositories";
import { CloudRepositoriesApi } from "./repositories";

class RepositoryProviderImpl {
    private serverApi: RepositoriesApi = new ServerRepositoriesApi();
    private cloudApi: RepositoriesApi = new CloudRepositoriesApi();

    forRepository(repo: Repository): RepositoriesApi {
        const site = siteDetailsForRepository(repo);
        if (site && site.isCloud) {
            return this.cloudApi;
        }

        return this.serverApi;
    }

    forRemote(remote: Remote): RepositoriesApi {
        const site = siteDetailsForRemote(remote);
        if (site && site.isCloud) {
            return this.cloudApi;
        }

        return this.serverApi;
    }
}

export const RepositoryProvider = new RepositoryProviderImpl();