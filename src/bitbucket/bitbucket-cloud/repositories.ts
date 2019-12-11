import { AxiosResponse } from "axios";
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { getAgent } from "../../jira/jira-client/providers";
import { Client, ClientError } from "../httpClient";
import { BitbucketBranchingModel, BitbucketSite, Commit, Repo, RepositoriesApi, UnknownUser } from "../model";
import { CloudPullRequestApi, maxItemsSupported } from "./pullRequests";

export class CloudRepositoriesApi implements RepositoriesApi {
    private client: Client;

    constructor(site: DetailedSiteInfo, token: string) {
        this.client = new Client(
            site.baseApiUrl,
            `Bearer ${token}`,
            getAgent(site),
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

    async getMirrorHosts(): Promise<string[]> {
        return [];
    }

    async get(site: BitbucketSite): Promise<Repo> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}`
        );

        return CloudRepositoriesApi.toRepo(data);
    }

    async getDevelopmentBranch(site: BitbucketSite): Promise<string> {

        const [repo, branchingModel] = await Promise.all([
            this.get(site),
            this.getBranchingModel(site)
        ]);

        return branchingModel.development && branchingModel.development.branch
            ? branchingModel.development.branch.name!
            : repo.mainbranch!;
    }

    async getBranches(site: BitbucketSite): Promise<string[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/refs/branches`,
            {
                pagelen: 50
            }
        );

        return data.values.map((val: any) => val.name);
    }

    async getBranchingModel(site: BitbucketSite): Promise<BitbucketBranchingModel> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/branching-model`
        );

        return data;
    }

    async getCommitsForRefs(site: BitbucketSite, includeRef: string, excludeRef: string): Promise<Commit[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/commits`,
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
            htmlSummary: commit.summary ? commit.summary.html! : "",
            rawSummary: commit.summary ? commit.summary.raw! : "",
            author: commit.author
                ? CloudPullRequestApi.toUserModel(commit.author!.user)
                : UnknownUser
        }));
    }

    async getPullRequestIdsForCommit(site: BitbucketSite, commitHash: string): Promise<string[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/commit/${commitHash}/pullrequests`
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
            parentFullName: bbRepo.parent?.full_name,
            url: bbRepo.links!.html!.href!,
            avatarUrl: bbRepo.links!.avatar!.href!,
            mainbranch: bbRepo.mainbranch ? bbRepo.mainbranch.name : undefined,
            issueTrackerEnabled: !!bbRepo.has_issues
        };
    }
}
