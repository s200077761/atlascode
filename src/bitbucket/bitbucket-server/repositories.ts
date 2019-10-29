import { AxiosResponse } from "axios";
import { getAgent } from "../../atlclients/agent";
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { Client, ClientError } from "../httpClient";
import { BitbucketBranchingModel, BitbucketSite, Commit, Repo, RepositoriesApi } from "../model";

export class ServerRepositoriesApi implements RepositoriesApi {
    private client: Client;

    constructor(site: DetailedSiteInfo, username: string, password: string) {
        this.client = new Client(
            site.baseApiUrl,
            `Basic ${Buffer.from(username + ":" + password).toString('base64')}`,
            getAgent(site),
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

    async getMirrorHosts(): Promise<string[]> {
        try {
            const { data } = await this.client.get(
                `/rest/mirroring/1.0/mirrorServers?limit=100`
            );

            return data.values.map((val: any) => new URL(val.baseUrl).hostname);
        } catch (e) {
            // ignore
        }
        return [];
    }

    async get(site: BitbucketSite): Promise<Repo> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}`
        );

        const { data: defaultBranch } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/branches/default`
        );

        return ServerRepositoriesApi.toRepo(site, data, defaultBranch.id);
    }

    async getDevelopmentBranch(site: BitbucketSite): Promise<string> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/rest/branch-utils/1.0/projects/${ownerSlug}/repos/${repoSlug}/branchmodel`
        );

        return data.development
            ? data.development.displayId
            : undefined;
    }

    async getBranchingModel(site: BitbucketSite): Promise<BitbucketBranchingModel> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/rest/branch-utils/1.0/projects/${ownerSlug}/repos/${repoSlug}/branchmodel`
        );

        return {
            type: 'branching_model',
            branch_types: (data.types || []).map((type: any) => ({
                kind: type.displayName,
                prefix: type.prefix
            }))
        };
    }

    async getCommitsForRefs(site: BitbucketSite, includeRef: string, excludeRef: string): Promise<Commit[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/commits`,
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
                avatarUrl: ServerRepositoriesApi.patchAvatarUrl(site.details.baseLinkUrl, commit.author.avatarUrl),
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
    async getPullRequestIdsForCommit(site: BitbucketSite, commitHash: string): Promise<number[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/commits/${commitHash}/pull-requests`
        );

        return data.values!.map((pr: any) => pr.id) || [];
    }

    static patchAvatarUrl(baseUrl: string, avatarUrl: string): string {
        if (avatarUrl && !/^http/.test(avatarUrl)) {
            return `${baseUrl}${avatarUrl}`;
        }
        return avatarUrl;
    }

    static toRepo(site: BitbucketSite, bbRepo: any, defaultBranch: string): Repo {
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

        let url: string = Array.isArray(bbRepo.links.self) ? (bbRepo.links.self[0].href || '') : '';
        url = url.endsWith('/browse') ? url.slice(0, url.lastIndexOf('/browse')) : url;

        return {
            id: bbRepo.id,
            name: bbRepo.slug,
            displayName: bbRepo.name,
            fullName: `${bbRepo.project.key}/${bbRepo.slug}`,
            url: url,
            avatarUrl: ServerRepositoriesApi.patchAvatarUrl(site.details.baseLinkUrl, bbRepo.avatarUrl),
            mainbranch: defaultBranch,
            issueTrackerEnabled: false
        };
    }
}
