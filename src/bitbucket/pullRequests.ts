import * as Bitbucket from 'bitbucket';
import * as GitUrlParse from 'git-url-parse';
import { Repository, Remote } from "../typings/git";

const bitbucketHost = "bitbucket.org";

export async function getPullRequestTitles(repository: Repository): Promise<string[]> {
    let bb = new Bitbucket();
    let remotes = getBitbucketRemotes(repository);

    let allPRs = [];
    for (let i = 0; i < remotes.length; i++) {
        let remote = remotes[i];
        let parsed = GitUrlParse(remote.fetchUrl || remote.pushUrl);
        const { data } = await bb.repositories.listPullRequests({ username: parsed.owner, repo_slug: parsed.name });
        allPRs = allPRs.concat(data.values);
    }

    return allPRs.map(pr => pr.title);
}

function getBitbucketRemotes(repository: Repository): Remote[] {
    return repository.state.remotes.filter(remote => {
        let parsed = GitUrlParse(remote.fetchUrl || remote.pushUrl);
        return parsed.source === bitbucketHost;
    });
}