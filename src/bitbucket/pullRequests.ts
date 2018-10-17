import * as Bitbucket from 'bitbucket';
import * as GitUrlParse from 'git-url-parse';
import * as GitDiffParser from 'parse-diff';
import { Repository, Remote } from "../typings/git";
import { PullRequestDecorated } from './model';

const bitbucketHost = "bitbucket.org";

export async function getPullRequestTitles(repository: Repository): Promise<string[]> {
    let bb = new Bitbucket();
    let remotes = getBitbucketRemotes(repository);

    let allPRs: PullRequestDecorated[] = [];
    for (let i = 0; i < remotes.length; i++) {
        let remote = remotes[i];
        let parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
        const { data } = await bb.repositories.listPullRequests({ username: parsed.owner, repo_slug: parsed.name });
        allPRs = allPRs.concat(data.values!.map(pr => { return { repository: repository, remote: remote, data: pr }; }));
    }

    return allPRs.map(pr => pr.data.title!);
}

export async function getPullRequests(repository: Repository): Promise<PullRequestDecorated[]> {
    let bb = new Bitbucket();
    let remotes = getBitbucketRemotes(repository);

    let allPRs: PullRequestDecorated[] = [];
    for (let i = 0; i < remotes.length; i++) {
        let remote = remotes[i];
        let parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
        const { data } = await bb.repositories.listPullRequests({ username: parsed.owner, repo_slug: parsed.name });
        allPRs = allPRs.concat(data.values!.map(pr => { return { repository: repository, remote: remote, data: pr }; }));
    }

    return allPRs;
}

export async function getPullRequest(pr: PullRequestDecorated): Promise<PullRequestDecorated> {
    let bb = new Bitbucket();
    let parsed = GitUrlParse(pr.remote.fetchUrl! || pr.remote.pushUrl!);
    let { data } = await bb.repositories.getPullRequest({
        pull_request_id: pr.data.id!,
        repo_slug: parsed.name,
        username: parsed.owner
    });

    return { repository: pr.repository, remote: pr.remote, data: data };
}

export async function getPullRequestChangedFiles(pr: PullRequestDecorated): Promise<any[]> {
    let bb = new Bitbucket();

    let result: any[] = [];
    const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
    let parsed = GitUrlParse(remoteUrl);
    let { data } = await bb.pullrequests.getDiff({
        pull_request_id: String(pr.data.id!),
        repo_slug: parsed.name,
        username: parsed.owner
    });

    let files = GitDiffParser(data);
    files.forEach(item => {
        let status = 'modified';
        if (item.to === '/dev/null') {
            item.to = undefined;
        }
        if (item.from === '/dev/null') {
            item.from = undefined;
        }
        if (item.from && item.to) {
            status = 'modified';
        } else if (item.to) {
            status = 'added';
        } else if (item.from) {
            status = 'removed';
        }
        result.push({
            blob_url: remoteUrl,
            raw_url: remoteUrl,
            contents_url: remoteUrl,
            filename: item.to ? item.to : item.from,
            status: status,
            patch: item.chunks.reduce((acc, i) => {
                return acc + i.changes.reduce((acc1, i1) => acc1 + '\n' + i1.content, i.content);
            }, ''),
            sha: undefined
        });
    });

    return result;
}

function getBitbucketRemotes(repository: Repository): Remote[] {
    return repository.state.remotes.filter(remote => {
        const remoteUrl = remote.fetchUrl || remote.pushUrl;
        let parsed = remoteUrl ? GitUrlParse(remoteUrl) : null;
        return parsed && parsed.source === bitbucketHost;
    });
}