import { Repository } from "../typings/git";
import { RepositoriesApi } from "./repositories";
import { GitUrlParse, bitbucketHosts, PullRequestApi } from "./pullRequests";
import { PaginatedBitbucketIssues } from "./model";

const defaultPageLength = 10;
const dummyRemote = { name: '', isReadOnly: true };

export namespace BitbucketIssuesApi {

    export async function getList(repository: Repository): Promise<PaginatedBitbucketIssues> {
        let remotes = PullRequestApi.getBitbucketRemotes(repository);
        if (remotes.length === 0) {
            return { repository: repository, remote: dummyRemote, data: [], next: undefined };
        }

        let parsed = GitUrlParse(RepositoriesApi.urlForRemote(remotes[0]));
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.repositories.listIssues({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: defaultPageLength,
            q: 'state="new" OR state="open" OR state="on hold"'
        });

        return { repository: repository, remote: remotes[0], data: data.values || [], next: data.next };
    }

    export async function getLatest(repository: Repository): Promise<PaginatedBitbucketIssues> {
        let remotes = PullRequestApi.getBitbucketRemotes(repository);
        if (remotes.length === 0) {
            return { repository: repository, remote: dummyRemote, data: [], next: undefined };
        }

        let parsed = GitUrlParse(RepositoriesApi.urlForRemote(remotes[0]));
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.repositories.listIssues({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: 1,
            q: '(state="new" OR state="open" OR state="on hold")',
            sort: '-created_on'
        });

        return { repository: repository, remote: remotes[0], data: data.values || [], next: data.next };
    }

    export async function nextPage({ repository, remote, next }: PaginatedBitbucketIssues): Promise<PaginatedBitbucketIssues> {
        let parsed = GitUrlParse(RepositoriesApi.urlForRemote(remote));
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.getNextPage({ next: next });
        //@ts-ignore
        return { repository: repository, remote: remote, data: data.values || [], next: data.next };
    }
}
