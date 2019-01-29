import * as gup from 'git-url-parse';
import { Repository, Remote } from "../typings/git";
import { PullRequest, PaginatedPullRequests, PaginatedCommits, PaginatedComments, PaginatedFileChanges } from './model';
import { Container } from "../container";
import { Logger } from '../logger';

export const bitbucketHosts = new Map()
    .set("bitbucket.org", async () => {
        const bb = await Container.clientManager.bbrequest();
        if (!bb) { return Promise.reject(apiConnectivityError); }
        return bb;
    })
    .set("bb-inf.net", async () => {
        const bb = await Container.clientManager.bbrequestStaging();
        if (!bb) { return Promise.reject(apiConnectivityError); }
        return bb;
    });
export const maxItemsSupported = {
    commits: 100,
    comments: 100,
    fileChanges: 100
};
const apiConnectivityError = new Error('cannot connect to bitbucket api');
const dummyRemote = { name: '', isReadOnly: true };

// had to do this as the library introduced a bug with latest update
export function GitUrlParse(url: string): gup.GitUrl {
    let parsed = gup(url);
    parsed.owner = parsed.owner.replace(':', '');
    parsed.name = parsed.name.replace(':', '');
    return parsed;
}

export namespace PullRequestApi {

    export async function getList(repository: Repository): Promise<PaginatedPullRequests> {
        Logger.debug('PullRequestApi.getList...');
        let remotes = getBitbucketRemotes(repository);

        Logger.debug(`got remotes: [${remotes.map(r => r.name)}]`);
        for (let i = 0; i < remotes.length; i++) {
            let remote = remotes[i];
            let parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
            const bb = await bitbucketHosts.get(parsed.source)();
            const { data } = await bb.repositories.listPullRequests({ username: parsed.owner, repo_slug: parsed.name });
            const prs: PullRequest[] = data.values!.map((pr: Bitbucket.Schema.Pullrequest) => { return { repository: repository, remote: remote, data: pr }; });
            const next = data.next;
            // Handling pull requests from multiple remotes is not implemented. We stop when we see the first remote with PRs.
            if (prs.length > 0) {
                Logger.debug(`PullRequestApi.getList: got ${prs.length} PRs for remote: ${remote.name}`);
                return { repository: repository, remote: remote, data: prs, next: next };
            }
        }

        Logger.debug('PullRequestApi.getList: no PRs found');
        return { repository: repository, remote: dummyRemote, data: [], next: undefined };
    }

    export async function nextPage({ repository, remote, next }: PaginatedPullRequests): Promise<PaginatedPullRequests> {
        let parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
        const bb = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.getNextPage({ next: next });
        //@ts-ignore
        const prs = (data as Bitbucket.Schema.Pullrequest).values!.map(pr => { return { repository: repository, remote: remote, data: pr }; });
        return { repository: repository, remote: remote, data: prs, next: data.next };
    }

    export async function getLatest(repository: Repository): Promise<PaginatedPullRequests> {
        Logger.debug('PullRequestApi.getLatest...');
        let remotes = getBitbucketRemotes(repository);

        Logger.debug(`got remotes: [${remotes.map(r => r.name)}]`);
        for (let i = 0; i < remotes.length; i++) {
            let remote = remotes[i];
            let parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
            const bb = await bitbucketHosts.get(parsed.source)!();
            const { data } = await bb.repositories.listPullRequests({ username: parsed.owner, repo_slug: parsed.name, pagelen: 1, sort: '-created_on' });
            const prs: PullRequest[] = data.values!.map((pr: Bitbucket.Schema.Pullrequest) => { return { repository: repository, remote: remote, data: pr }; });
            const next = data.next;
            // Handling pull requests from multiple remotes is not implemented. We stop when we see the first remote with PRs.
            if (prs.length > 0) {
                Logger.debug(`PullRequestApi.getLatest: got ${prs.length} PRs for remote: ${remote.name}`);
                return { repository: repository, remote: remote, data: prs, next: next };
            }
        }

        Logger.debug('PullRequestApi.getLatest: no PRs found');
        return { repository: repository, remote: dummyRemote, data: [], next: undefined };
    }

    export async function get(pr: PullRequest): Promise<PullRequest> {
        let parsed = GitUrlParse(pr.remote.fetchUrl! || pr.remote.pushUrl!);
        const bb = await bitbucketHosts.get(parsed.source)();
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
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source)();
        let { data } = await bb.pullrequests.getDiffStat({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner
        });

        return data.values ? { data: data.values as Bitbucket.Schema.Diffstat[], next: data.next } : { data: [], next: undefined };
    }

    export async function getCommits(pr: PullRequest): Promise<PaginatedCommits> {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source)();
        let { data } = await bb.pullrequests.listCommits({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.commits
        });

        return data.values ? { data: data.values, next: data.next } : { data: [], next: undefined };
    }

    export async function getComments(pr: PullRequest): Promise<PaginatedComments> {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source)();
        let { data } = await bb.pullrequests.listComments({
            pull_request_id: pr.data.id!,
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.comments
        });

        return data.values ? { data: data.values, next: data.next } : { data: [], next: undefined };
    }

    export async function getBuildStatuses(pr: PullRequest): Promise<Bitbucket.Schema.Commitstatus[]> {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb:Bitbucket = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.pullrequests.listStatuses({
            pull_request_id: pr.data.id!,
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: maxItemsSupported.comments
        });

        const statuses = data.values || [];
        return statuses.filter(status => status.type === 'build');
    }

    export function getBitbucketRemotes(repository: Repository): Remote[] {
        return repository.state.remotes.filter(remote => {
            const remoteUrl = remote.fetchUrl || remote.pushUrl;
            let parsed = remoteUrl ? GitUrlParse(remoteUrl) : null;
            return parsed && bitbucketHosts.has(parsed.source);
        });
    }

    export async function create(pr: PullRequest): Promise<PullRequest> {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source)();
        const { data } = await bb.pullrequests.create({
            repo_slug: parsed.name,
            username: parsed.owner,
            _body: {
                type: pr.data.type,
                title: pr.data.title,
                summary: pr.data.summary,
                source: pr.data.source,
                destination: pr.data.destination
            }
        });

        return {...pr, ...{data: data}};
    }

    export async function approve(pr: PullRequest) {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source)();
        return await bb.pullrequests.createApproval({
            pull_request_id: String(pr.data.id!),
            repo_slug: parsed.name,
            username: parsed.owner
        });
    }

    export async function merge(pr: PullRequest) {
        const remoteUrl = pr.remote.fetchUrl! || pr.remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source)();
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
        const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
        let parsed = GitUrlParse(remoteUrl);
        const bb = await bitbucketHosts.get(parsed.source)();
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