import { Remote } from "../typings/git";
import { parseGitUrl, urlForRemote, siteDetailsForRemote } from "../bitbucket/bbUtils";
import { Repo, Commit, BitbucketBranchingModel, RepositoriesApi } from "../bitbucket/model";
import { Client } from "./httpClient";
import { DetailedSiteInfo } from "../atlclients/authInfo";

export class ServerRepositoriesApi implements RepositoriesApi {
    private client: Client;

    constructor(site: DetailedSiteInfo, username: string, password: string, agent: any) {
        this.client = new Client(
            site.baseApiUrl,
            `Basic ${Buffer.from(username + ":" + password).toString('base64')}`,
            agent
        );
    }

    async get(remote: Remote): Promise<Repo> {
        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}`
        );

        const { data: defaultBranch } = await this.client.get(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/branches/default`
        );

        return ServerRepositoriesApi.toRepo(data, defaultBranch.data.id);
    }

    async getDevelopmentBranch(remote: Remote): Promise<string> {
        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this.client.get(
            `/rest/branch-utils/1.0/projects/${parsed.owner}/repos/${parsed.name}/branchmodel`
        );

        return data.development
            ? data.development.displayId
            : undefined;
    }

    async getBranchingModel(remote: Remote): Promise<BitbucketBranchingModel> {
        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this.client.get(
            `/rest/branch-utils/1.0/projects/${parsed.owner}/repos/${parsed.name}/branchmodel`
        );

        return {
            type: 'branching_model',
            branch_types: (data.types || []).map((type: any) => ({
                kind: type.displayName,
                prefix: type.prefix
            }))
        };
    }

    async getCommitsForRefs(remote: Remote, includeRef: string, excludeRef: string): Promise<Commit[]> {
        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/commits`,
            {
                until: includeRef,
                since: excludeRef
            }
        );

        const commits: any[] = data.values || [];

        return commits.map(commit => ({
            hash: commit.id,
            message: commit.message!,
            ts: commit.authorTimestamp,
            url: undefined!,
            htmlSummary: commit.summary ? commit.summary.html! : undefined,
            rawSummary: commit.summary ? commit.summary.raw! : undefined,
            author: {
                accountId: commit.author.id,
                displayName: commit.author.displayName,
                url: undefined!,
                avatarUrl: ServerRepositoriesApi.patchAvatarUrl(siteDetailsForRemote(remote)!.baseLinkUrl, commit.author.avatarUrl)
            }
        }));
    }

    async getPullRequestsForCommit(remote: Remote, commitHash: string): Promise<Bitbucket.Schema.Pullrequest[]> {
        return [];
    }

    static patchAvatarUrl(baseUrl: string, avatarUrl: string): string {
        if (avatarUrl && !/^http/.test(avatarUrl)) {
            return `${baseUrl}${avatarUrl}`;
        }
        return avatarUrl;
    }

    static toRepo(bbRepo: any, defaultBranch: string): Repo {
        return {
            id: bbRepo.id,
            name: bbRepo.slug,
            displayName: bbRepo.name,
            fullName: `${bbRepo.project.key}/${bbRepo.slug}`,
            url: bbRepo.links.self[0].href,
            avatarUrl: bbRepo.avatarUrl,
            mainbranch: defaultBranch,
            issueTrackerEnabled: false
        };
    }
}
