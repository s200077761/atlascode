import { Remote, Repository } from "../../typings/git";
import { parseGitUrl, urlForRemote, siteDetailsForRemote } from "../bbUtils";
import { Repo, Commit, BitbucketBranchingModel, RepositoriesApi, PaginatedBranchNames } from "../model";
import { Client, ClientError } from "../httpClient";
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { AxiosResponse } from "axios";

export class ServerRepositoriesApi implements RepositoriesApi {
    private client: Client;

    constructor(site: DetailedSiteInfo, username: string, password: string, agent: any) {
        this.client = new Client(
            site.baseApiUrl,
            `Basic ${Buffer.from(username + ":" + password).toString('base64')}`,
            agent,
            async (response: AxiosResponse): Promise<Error> => {
                let errString = 'Unknown error';
                const errJson = await response.data;

                if (errJson.errors && Array.isArray(errJson.errors) && errJson.errors.length > 0) {
                    const e = errJson.errors[0];
                    errString = e.message || errString;
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
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}`
        );

        const { data: defaultBranch } = await this.client.get(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/branches/default`
        );

        return ServerRepositoriesApi.toRepo(remote, data, defaultBranch.id);
    }

    async getBranches(remote: Remote, queryParams?: any): Promise<PaginatedBranchNames> {
        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${parsed.owner}/repos/${parsed.name}/branches`,
            queryParams
        );

        return { data: (data.values || []).map((v: any) => v.name), next: data.next };
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
                accountId: commit.author.slug,
                displayName: commit.author.displayName,
                url: undefined!,
                avatarUrl: ServerRepositoriesApi.patchAvatarUrl(siteDetailsForRemote(remote)!.baseLinkUrl, commit.author.avatarUrl),
                mention: `@${commit.author.slug}`
            }
        }));
    }

    /**
     * This method then uses `git show` and scans the commit message for an 
     * explicit mention of a pull request, which is populated by default in the
     * Bitbucket UI.
     *
     * This won't work if the author of the PR wrote a custom commit message
     * without mentioning the PR.
     */
    async getPullRequestIdsForCommit(repository: Repository, remote: Remote, commitHash: string): Promise<number[]> {
        const mergeBase = await repository.getMergeBase(commitHash, 'master');
        const { message } = await repository.getCommit(mergeBase);

        const match = message.match(/pull request #(\d+)/);
        if (match) {
            return [parseInt(match[1], 10)];
        }

        return [];
    }

    static patchAvatarUrl(baseUrl: string, avatarUrl: string): string {
        if (avatarUrl && !/^http/.test(avatarUrl)) {
            return `${baseUrl}${avatarUrl}`;
        }
        return avatarUrl;
    }

    static toRepo(remote: Remote, bbRepo: any, defaultBranch: string): Repo {
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
            id: bbRepo.id,
            name: bbRepo.slug,
            displayName: bbRepo.name,
            fullName: `${bbRepo.project.key}/${bbRepo.slug}`,
            url: bbRepo.links.self[0].href,
            avatarUrl: ServerRepositoriesApi.patchAvatarUrl(siteDetailsForRemote(remote)!.baseLinkUrl, bbRepo.avatarUrl),
            mainbranch: defaultBranch,
            issueTrackerEnabled: false
        };
    }
}
