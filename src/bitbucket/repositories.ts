import { Remote } from "../typings/git";
import { GitUrlParse, maxItemsSupported, bitbucketHosts } from "./pullRequests";
import { Repo } from "./model";

export namespace RepositoriesApi {

    export async function get(remote: Remote): Promise<Repo> {
        const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
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
            url: bbRepo.links!.html!.href!,
            avatarUrl: bbRepo.links!.avatar!.href!,
            mainbranch: bbRepo.mainbranch ? bbRepo.mainbranch.name : undefined,
            issueTrackerEnabled: !!bbRepo.has_issues
        };
    }

    export async function getDevelopmentBranch(remote: Remote): Promise<string> {
        const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
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

    export async function getBranchingModel(remote: Remote): Promise<Bitbucket.Schema.BranchingModel> {
        const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
        return bb.repositories.getBranchingModel({
            repo_slug: parsed.name,
            username: parsed.owner
        }).then(res => res.data);
    }

    export async function getCommitsForRefs(remote: Remote, includeRef: string, excludeRef: string): Promise<Bitbucket.Schema.Commit[]> {
        const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
        const { data } = await bb.repositories.listCommits({
            repo_slug: parsed.name,
            username: parsed.owner,
            include: includeRef,
            exclude: excludeRef,
            pagelen: maxItemsSupported.commits
        });

        return data.values;
    }

    export async function getPullRequestsForCommit(remote: Remote, commitHash: string): Promise<Bitbucket.Schema.Pullrequest[]> {
        let parsed = GitUrlParse(urlForRemote(remote));
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
        const { data } = await bb.repositories.listPullrequestsForCommit({
            repo_slug: parsed.name,
            username: parsed.owner,
            commit: commitHash
        });

        return data.values || [];
    }

    export function urlForRemote(remote: Remote): string {
        return remote.fetchUrl! || remote.pushUrl!;
    }

    export function isStagingUrl(url: string): boolean {
        return url.indexOf('bb-inf.net') !== -1;
    }
}
