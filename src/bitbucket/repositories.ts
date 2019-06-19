import { Remote } from "../typings/git";
import { maxItemsSupported } from "./pullRequests";
import { parseGitUrl, clientForHostname, urlForRemote } from "./bbUtils";
import { Repo, Commit, BitbucketBranchingModel } from "./model";

export namespace RepositoriesApi {

    export async function get(remote: Remote): Promise<Repo> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.source);
        const { data } = await bb.repositories.get({
            repo_slug: parsed.name,
            username: parsed.owner
        });

        return toRepo(data);
    }

    export function toRepo(bbRepo: Bitbucket.Schema.Repository): Repo {
        return {
            name: bbRepo.owner ? bbRepo.owner!.username! : bbRepo.name!,
            displayName: bbRepo.name!,
            fullName: bbRepo.full_name!,
            url: bbRepo.links!.html!.href!,
            avatarUrl: bbRepo.links!.avatar!.href!,
            mainbranch: bbRepo.mainbranch ? bbRepo.mainbranch.name : undefined,
            issueTrackerEnabled: !!bbRepo.has_issues
        };
    }

    export async function getDevelopmentBranch(remote: Remote): Promise<string> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.source);
        const [repo, branchingModel] = await Promise.all([
            RepositoriesApi.get(remote),
            bb.repositories.getBranchingModel({
                repo_slug: parsed.name,
                username: parsed.owner
            })
        ]);

        return branchingModel.data.development && branchingModel.data.development.branch
            ? branchingModel.data.development.branch.name!
            : repo.mainbranch!;
    }

    export async function getBranchingModel(remote: Remote): Promise<BitbucketBranchingModel> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.source);
        return bb.repositories.getBranchingModel({
            repo_slug: parsed.name,
            username: parsed.owner
        }).then(res => res.data);
    }

    export async function getCommitsForRefs(remote: Remote, includeRef: string, excludeRef: string): Promise<Commit[]> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.source);
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

    export async function getPullRequestsForCommit(remote: Remote, commitHash: string): Promise<Bitbucket.Schema.Pullrequest[]> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.source);
        const { data } = await bb.repositories.listPullrequestsForCommit({
            repo_slug: parsed.name,
            username: parsed.owner,
            commit: commitHash
        });

        return data.values || [];
    }
}
