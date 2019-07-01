import { Remote } from "../typings/git";
import { parseGitUrl, clientForHostname, urlForRemote, siteDetailsForRemote } from "../bitbucket/bbUtils";
import { Repo, Commit, BitbucketBranchingModel, RepositoriesApi } from "../bitbucket/model";

export class ServerRepositoriesApi implements RepositoriesApi {

    async get(remote: Remote): Promise<Repo> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;
        const { data } = await bb.repos.getRepository({
            projectKey: parsed.owner,
            repositorySlug: parsed.name
        });

        return ServerRepositoriesApi.toRepo(data);
    }



    async getDevelopmentBranch(remote: Remote): Promise<string> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;
        const { data } = await bb.repos.getBranchModel({
            projectKey: parsed.owner,
            repositorySlug: parsed.name
        });

        return data.development
            ? data.development.displayId
            : undefined;
    }

    async getBranchingModel(remote: Remote): Promise<BitbucketBranchingModel> {
        return undefined!;
    }

    async getCommitsForRefs(remote: Remote, includeRef: string, excludeRef: string): Promise<Commit[]> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb = await clientForHostname(parsed.resource) as BitbucketServer;
        const { data } = await bb.repos.getCommits({
            projectKey: parsed.owner,
            repositorySlug: parsed.name,
            until: includeRef,
            since: excludeRef
        });

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

    static toRepo(bbRepo: any): Repo {
        return {
            name: bbRepo.slug,
            displayName: bbRepo.name,
            fullName: `${bbRepo.project.key}/${bbRepo.slug}`,
            url: bbRepo.links.self[0].href,
            avatarUrl: bbRepo.avatarUrl,
            mainbranch: undefined,
            issueTrackerEnabled: false
        };
    }
}
