import * as gup from 'git-url-parse';
import * as GitDiffParser from 'parse-diff';
import { Repository, Remote } from "../typings/git";
import { PullRequest, PaginatedPullRequests, PaginatedCommits, PaginatedComments, PaginatedFileChanges } from './model';
import { Container } from "../container";
import { Logger } from '../logger';

const bitbucketHost = "bitbucket.org";
const apiConnectivityError = new Error('cannot connect to bitbucket api');
const dummyRemote = { name: '', isReadOnly: true };
const maxItemsSupported = {
    commits: 100,
    comments: 100,
    fileChanges: 100
};

// had to do this as the library introduced a bug with latest update
export function GitUrlParse(url: string): gup.GitUrl {
    let parsed = gup(url);
    parsed.owner = parsed.owner.replace(':', '');
    parsed.name = parsed.name.replace(':', '');
    return parsed;
}

export namespace PullRequestApi {

    export async function getList(repository: Repository): Promise<PaginatedPullRequests> {
        Logger.debug('getting PRs...');
        let bb = await Container.clientManager.bbrequest();
        if (!bb) { return Promise.reject(apiConnectivityError); }

        let remotes = getBitbucketRemotes(repository);

        Logger.debug(`got remotes: [${remotes.map(r => r.name)}]`);
        for (let i = 0; i < remotes.length; i++) {
            let remote = remotes[i];
            let parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
            const { data } = await bb.repositories.listPullRequests({ username: parsed.owner, repo_slug: parsed.name });
            const prs: PullRequest[] = data.values!.map((pr: Bitbucket.Schema.Pullrequest) => { return { repository: repository, remote: remote, data: pr }; });
            const next = data.next;
            // Handling pull requests from multiple remotes is not implemented. We stop when we see the first remote with PRs.
            if (prs.length > 0) {
                Logger.debug(`got ${prs.length} PRs for remote: ${remote.name}`);
                return { repository: repository, remote: remote, data: prs, next: next };
            }
        }

        Logger.debug('no PRs found');
        return { repository: repository, remote: dummyRemote, data: [], next: undefined };
    }

    export async function nextPage({ repository, remote, next }: PaginatedPullRequests): Promise<PaginatedPullRequests> {
        let bb = await Container.clientManager.bbrequest();
        if (!bb) { return Promise.reject(apiConnectivityError); }

        const { data } = await bb.getNextPage({ next: next });
        //@ts-ignore
        const prs = (data as Bitbucket.Schema.Pullrequest).values!.map(pr => { return { repository: repository, remote: remote, data: pr }; });
        return { repository: repository, remote: remote, data: prs, next: data.next };
    }

    export async function get(pr: PullRequest): Promise<PullRequest> {
        let bb = await Container.clientManager.bbrequest();
        if (!bb) { return Promise.reject(apiConnectivityError); }

        let parsed = GitUrlParse(pr.remote.fetchUrl! || pr.remote.pushUrl!);
        let { data } = await bb.repositories.getPullRequest({
            pull_request_id: pr.data.id!,
            repo_slug: parsed.name,
            username: parsed.owner
        });
        let sourceRemote: Remote | undefined = undefined;
        if (data.source!.repository!.links!.html!.href! !== data.destination!.repository!.links!.html!.href!) {
            sourceRemote = {
                fetchUrl: data.source!.repository!.links!.html!.href!,
                name: data.source!.repository!.full_name!,
                isReadOnly: true
            };
        }
        return { repository: pr.repository, remote: pr.remote, sourceRemote: sourceRemote, data: data };
    }

    export async function getChangedFiles(pr: PullRequest): Promise<PaginatedFileChanges> {
        let bb = await Container.clientManager.bbrequest();
        if (!bb) { return Promise.reject(apiConnectivityError); }

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

        return { data: result, next: undefined };
    }

    export async function getCommits(pr: PullRequest): Promise<PaginatedCommits> {
        let bb = await Container.clientManager.bbrequest();
        if (!bb) { return Promise.reject(apiConnectivityError); }

        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        let { data } = await bb.pullrequests.listCommits({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.commits
        });

        return data.values ? { data: data.values, next: data.next } : { data: [], next: undefined };
    }

    export async function getComments(pr: PullRequest): Promise<PaginatedComments> {
        let bb = await Container.clientManager.bbrequest();
        if (!bb) { return Promise.reject(apiConnectivityError); }

        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        let { data } = await bb.pullrequests.listComments({
            pull_request_id: pr.data.id!,
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.comments
        });

        return data.values ? { data: data.values, next: data.next } : { data: [], next: undefined };
    }

    export function getBitbucketRemotes(repository: Repository): Remote[] {
        return repository.state.remotes.filter(remote => {
            const remoteUrl = remote.fetchUrl || remote.pushUrl;
            let parsed = remoteUrl ? GitUrlParse(remoteUrl) : null;
            return parsed && parsed.source === bitbucketHost;
        });
    }

    export async function approve(pr: PullRequest) {
        let bb = await Container.clientManager.bbrequest();
        if (!bb) { return Promise.reject(apiConnectivityError); }

        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        return await bb.pullrequests.createApproval({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner
        });
    }

    export async function merge(pr: PullRequest) {
        let bb = await Container.clientManager.bbrequest();
        if (!bb) { return Promise.reject(apiConnectivityError); }

        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        return await bb.pullrequests.merge({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner
        });
    }

    export async function postComment(
        remote: Remote,
        prId: number, text: string,
        parentCommentId?: number,
        inline?: { from?: number, to?: number, path: string }
    ): Promise<Bitbucket.Schema.Comment> {

        let bb = await Container.clientManager.bbrequest();
        if (!bb) { return Promise.reject(apiConnectivityError); }

        const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        //@ts-ignore
        return await bb.pullrequests.createComment({
            pull_request_id: prId,
            repo_slug: parsed.name,
            username: parsed.owner,
            _body: {
                parent: parentCommentId ? { id: parentCommentId } : undefined,
                content: {
                    raw: text
                },
                inline: inline
            } as any
        });
    }
}