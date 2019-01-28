import { Remote } from "../typings/git";
import { GitUrlParse, maxItemsSupported, bitbucketHosts } from "./pullRequests";

export namespace RepositoriesApi {

    export async function get(remote: Remote): Promise<Bitbucket.Schema.Repository> {
        const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.repositories.get({
            repo_slug: parsed.name,
            username: parsed.owner
        });

        return data;
    }

    export async function getCommitsForRefs(remote: Remote, includeRef: string, excludeRef: string): Promise<Bitbucket.Schema.Commit[]> {
        const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
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
        const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.repositories.getPullrequestsForCommit({
            repo_slug: parsed.name,
            username: parsed.owner,
            commit: commitHash
        });

        return data.values || [];
    }
}
