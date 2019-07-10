import { Remote } from "../typings/git";
import { maxItemsSupported } from "./pullRequests";
import { parseGitUrl, clientForHostname, urlForRemote } from "./bbUtils";
import { Repo, Commit, BitbucketBranchingModel, RepositoriesApi } from "./model";

export class CloudRepositoriesApi implements RepositoriesApi {

    async get(remote: Remote): Promise<Repo> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        const { data } = await bb.repositories.get({
            repo_slug: parsed.name,
            username: parsed.owner
        });

        return CloudRepositoriesApi.toRepo(data);
    }

    async getDevelopmentBranch(remote: Remote): Promise<string> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        const [repo, branchingModel] = await Promise.all([
            this.get(remote),
            bb.repositories.getBranchingModel({
                repo_slug: parsed.name,
                username: parsed.owner
            })
        ]);

        return branchingModel.data.development && branchingModel.data.development.branch
            ? branchingModel.data.development.branch.name!
            : repo.mainbranch!;
    }

    async getBranchingModel(remote: Remote): Promise<BitbucketBranchingModel> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        return bb.repositories.getBranchingModel({
            repo_slug: parsed.name,
            username: parsed.owner
        }).then(res => res.data);
    }

    async getCommitsForRefs(remote: Remote, includeRef: string, excludeRef: string): Promise<Commit[]> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        const { data } = await bb.repositories.listCommits({
            repo_slug: parsed.name,
            username: parsed.owner,
            include: includeRef,
            exclude: excludeRef,
            pagelen: maxItemsSupported.commits
        });

        const commits: Bitbucket.Schema.Commit[] = data.values || [];

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

    async getPullRequestsForCommit(remote: Remote, commitHash: string): Promise<Bitbucket.Schema.Pullrequest[]> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        const { data } = await bb.repositories.listPullrequestsForCommit({
            repo_slug: parsed.name,
            username: parsed.owner,
            commit: commitHash
        });

        return data.values || [];
    }

    static toRepo(bbRepo: Bitbucket.Schema.Repository): Repo {
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
