import { Remote } from "../typings/git";
import { maxItemsSupported } from "./pullRequests";
import { parseGitUrl, clientForHostname, urlForRemote } from "./bbUtils";

export namespace RepositoriesApi {

    export async function get(remote: Remote): Promise<Bitbucket.Schema.Repository> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.source);
        const { data } = await bb.repositories.get({
            repo_slug: parsed.name,
            username: parsed.owner
        });

        return data;
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
            : repo.mainbranch!.name!;
    }

    export async function getBranchingModel(remote: Remote): Promise<Bitbucket.Schema.BranchingModel> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.source);
        return bb.repositories.getBranchingModel({
            repo_slug: parsed.name,
            username: parsed.owner
        }).then(res => res.data);
    }

    export async function getCommitsForRefs(remote: Remote, includeRef: string, excludeRef: string): Promise<Bitbucket.Schema.Commit[]> {
        let parsed = parseGitUrl(urlForRemote(remote));
        const bb: Bitbucket = await clientForHostname(parsed.source);
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
