import { Remote, Repository } from "../../typings/git";
import { maxItemsSupported } from "./pullRequests";
import { parseGitUrl, urlForRemote } from "../bbUtils";
import { Repo, Commit, BitbucketBranchingModel, RepositoriesApi, PaginatedBranchNames } from "../model";
import { Client, ClientError } from "../httpClient";
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { AxiosResponse } from "axios";

export class CloudRepositoriesApi implements RepositoriesApi {
    private client: Client;

    constructor(site: DetailedSiteInfo, token: string, agent: any) {
        this.client = new Client(
            site.baseApiUrl,
            `Bearer ${token}`,
            agent,
            async (response: AxiosResponse): Promise<Error> => {
                let errString = 'Unknown error';
                const errJson = response.data;

                if (errJson.error && errJson.error.message) {
                    errString = errJson.error.message;
                } else {
                    errString = errJson;
                }

                return new ClientError(response.statusText, errString);
            }
        );
    }

    async get(remote: Remote): Promise<Repo> {
        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}`
        );

        return CloudRepositoriesApi.toRepo(data);
    }

    async getBranches(remote: Remote, queryParams?: any): Promise<PaginatedBranchNames> {
        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/refs/branches`,
            queryParams
        );

        return { data: (data.values || []).map((v: any) => v.name), next: data.next };
    }

    async getDevelopmentBranch(remote: Remote): Promise<string> {

        const [repo, branchingModel] = await Promise.all([
            this.get(remote),
            this.getBranchingModel(remote)
        ]);

        return branchingModel.development && branchingModel.development.branch
            ? branchingModel.development.branch.name!
            : repo.mainbranch!;
    }

    async getBranchingModel(remote: Remote): Promise<BitbucketBranchingModel> {
        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/branching-model`
        );

        return data;
    }

    async getCommitsForRefs(remote: Remote, includeRef: string, excludeRef: string): Promise<Commit[]> {
        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/commits`,
            {
                include: includeRef,
                exclude: excludeRef,
                pagelen: maxItemsSupported.commits
            }
        );

        const commits: any[] = data.values || [];

        return commits.map(commit => ({
            hash: commit.hash!,
            message: commit.message!,
            ts: commit.date!,
            url: commit.links!.html!.href!,
            htmlSummary: commit.summary ? commit.summary.html! : undefined,
            rawSummary: commit.summary ? commit.summary.raw! : undefined,
            author: {
                accountId: commit.author!.user!.account_id,
                displayName: commit.author!.user!.display_name!,
                url: commit.author!.user!.links!.html!.href!,
                avatarUrl: commit.author!.user!.links!.avatar!.href!
            }
        }));
    }

    async getPullRequestIdsForCommit(repository: Repository, remote: Remote, commitHash: string): Promise<number[]> {
        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this.client.get(
            `/repositories/${parsed.owner}/${parsed.name}/commit/${commitHash}/pullrequests`
        );

        return data.values!.map((pr: any) => pr.id) || [];
    }

    static toRepo(bbRepo: any): Repo {
        if (!bbRepo) {
            return {
                id: 'REPO_NOT_FOUND',
                name: 'REPO_NOT_FOUND',
                displayName: 'REPO_NOT_FOUND',
                fullName: 'REPO_NOT_FOUND',
                url: '',
                avatarUrl: '',
                mainbranch: undefined,
                issueTrackerEnabled: false
            };
        }

        return {
            id: bbRepo.uuid!,
            name: bbRepo.owner ? bbRepo.owner!.username! : bbRepo.name!,
            displayName: bbRepo.name!,
            fullName: bbRepo.full_name!,
            url: bbRepo.links!.html!.href!,
            avatarUrl: bbRepo.links!.avatar!.href!,
            mainbranch: bbRepo.mainbranch ? bbRepo.mainbranch.name : undefined,
            issueTrackerEnabled: !!bbRepo.has_issues
        };
    }
}
