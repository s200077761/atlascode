import { Repository, Remote } from "../typings/git";
import { getBitbucketRemotes, parseGitUrl, urlForRemote, clientForRemote, clientForHostname } from "./bbUtils";
import { PaginatedBitbucketIssues, BitbucketIssue, PaginatedComments, UnknownUser, Comment } from "./model";
import { RepositoryProvider } from "./repoProvider";

const defaultPageLength = 25;
export const maxItemsSupported = {
    comments: 100,
    changes: 100
};
const dummyRemote = { name: '', isReadOnly: true };

export namespace BitbucketIssuesApi {

    // ---- BEGIN - Actions NOT on a specific issue ----
    // ---- => ensure Bitbucket Issues are enabled for the repo

    export async function getList(repository: Repository): Promise<PaginatedBitbucketIssues> {
        let remotes = getBitbucketRemotes(repository);
        if (remotes.length === 0 || !await bitbucketIssuesEnabled(remotes[0])) {
            return { repository: repository, remote: dummyRemote, data: [], next: undefined };
        }

        let parsed = parseGitUrl(urlForRemote(remotes[0]));
        const bb: Bitbucket = await clientForRemote(remotes[0]) as Bitbucket;

        const { data } = await bb.repositories.listIssues({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: defaultPageLength,
            q: 'state="new" OR state="open" OR state="on hold"'
        });

        return { repository: repository, remote: remotes[0], data: data.values || [], next: data.next };
    }

    export async function getAvailableComponents(repositoryHref: string): Promise<Bitbucket.Schema.Component[] | undefined> {
        let parsed = parseGitUrl(repositoryHref);
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;

        const resp = await bb.repositories.listComponents({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: defaultPageLength
        });

        return resp.data.values;
    }

    export async function getIssuesForKeys(repository: Repository, issueKeys: string[]): Promise<BitbucketIssue[]> {
        let remotes = getBitbucketRemotes(repository);
        if (remotes.length === 0 || !await bitbucketIssuesEnabled(remotes[0])) {
            return [];
        }

        let parsed = parseGitUrl(urlForRemote(remotes[0]));
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;

        const keyNumbers = issueKeys.map(key => key.replace('#', ''));
        const results = await Promise.all(keyNumbers.map(key => bb.repositories.getIssue({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: key
        })));
        return results.map(result => result.data || []);
    }

    export async function getLatest(repository: Repository): Promise<PaginatedBitbucketIssues> {
        let remotes = getBitbucketRemotes(repository);
        if (remotes.length === 0 || !await bitbucketIssuesEnabled(remotes[0])) {
            return { repository: repository, remote: dummyRemote, data: [], next: undefined };
        }

        let parsed = parseGitUrl(urlForRemote(remotes[0]));
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        const { data } = await bb.repositories.listIssues({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: 2,
            q: '(state="new" OR state="open" OR state="on hold")',
            sort: '-created_on'
        });

        return { repository: repository, remote: remotes[0], data: data.values || [], next: data.next };
    }

    export async function bitbucketIssuesEnabled(remote: Remote): Promise<boolean> {
        return !!(await RepositoryProvider.forRemote(remote).get(remote)).issueTrackerEnabled;
    }

    // ---- END - Actions NOT on a specific issue ----


    // ---- BEGIN - Issue specific actions ----
    // ---- => Bitbucket Issues enabled for the repo

    export async function refetch(issue: BitbucketIssue): Promise<BitbucketIssue> {
        let parsed = parseGitUrl(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        const { data } = await bb.repositories.getIssue({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString()
        });

        return data;
    }

    export async function getComments(issue: BitbucketIssue): Promise<PaginatedComments> {
        let parsed = parseGitUrl(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        const { data } = await bb.repositories.listIssueComments({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString(),
            pagelen: maxItemsSupported.comments,
            sort: '-created_on'
        });

        return {
            data: (data.values || []).reverse().map(comment => ({
                id: comment.id!,
                parentId: comment.parent ? comment.parent.id! : undefined,
                htmlContent: comment.content!.html!,
                rawContent: comment.content!.raw!,
                ts: comment.created_on!,
                updatedTs: comment.updated_on!,
                deleted: !!comment.deleted,
                inline: comment.inline,
                user: comment.user
                    ? {
                        accountId: comment.user.account_id!,
                        displayName: comment.user.display_name!,
                        url: comment.user.links!.html!.href!,
                        avatarUrl: comment.user.links!.avatar!.href!
                    }
                    : UnknownUser,
                children: []
            })),
            next: data.next
        };
    }

    export async function getChanges(issue: BitbucketIssue): Promise<PaginatedComments> {
        let parsed = parseGitUrl(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        const { data } = await bb.repositories.listIssueChanges({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString(),
            pagelen: maxItemsSupported.changes,
            sort: '-created_on'
        });

        const changes: Bitbucket.Schema.IssueChange[] = (data.values || []).reverse();

        const updatedChanges: Bitbucket.Schema.IssueChange[] = changes
            .map(change => {
                let content = '';
                if (change.changes!.state) {
                    content += `<li><em>changed status from <strong>${change.changes!.state!.old}</strong> to <strong>${change.changes!.state!.new}</strong></em></li>`;
                }
                if (change.changes!.kind) {
                    content += `<li><em>changed issue type from <strong>${change.changes!.kind!.old}</strong> to <strong>${change.changes!.kind!.new}</strong></em></li>`;
                }
                if (change.changes!.priority) {
                    content += `<li><em>changed issue priority from <strong>${change.changes!.priority!.old}</strong> to <strong>${change.changes!.priority!.new}</strong></em></li>`;
                }
                //@ts-ignore
                if (change.changes!.attachment && change.changes!.attachment!.new) {
                    //@ts-ignore
                    content += `<li><em>added attachment <strong>${change.changes!.attachment!.new}</strong></em></li>`;
                }
                //@ts-ignore
                if (change.changes!.assignee_account_id) {
                    content += `<li><em>updated assignee</em></li>`;
                }
                if (change.changes!.content) {
                    content += `<li><em>updated description</em></li>`;
                }
                if (change.changes!.title) {
                    content += `<li><em>updated title</em></li>`;
                }

                if (content === '') {
                    content += `<li><em>updated issue</em></li>`;
                }
                return { ...change, message: { html: `<p><ul>${content}</ul>${change.message!.html}</p>` } };
            });

        const updatedChangesAsComments: Comment[] = updatedChanges.map(change => ({
            id: change.id as number,
            htmlContent: change.message!.html!,
            rawContent: change.message!.raw!,
            deleted: false,
            ts: change.created_on!,
            updatedTs: change.created_on!,
            user: change.user
                ? {
                    accountId: change.user.account_id!,
                    displayName: change.user.display_name!,
                    url: change.user.links!.html!.href!,
                    avatarUrl: change.user.links!.avatar!.href!
                }
                : UnknownUser,
            children: []
        }));

        return { data: updatedChangesAsComments, next: data.next };
    }

    export async function postChange(issue: BitbucketIssue, newStatus: string, content?: string): Promise<void> {
        let parsed = parseGitUrl(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        await bb.repositories.createIssueChange({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString(),
            _body: {
                type: 'issue_change',
                changes: {
                    state: {
                        new: newStatus
                    }
                },
                content: {
                    raw: content
                }
            }
        });
    }

    export async function postNewComponent(issue: BitbucketIssue, newComponent: string): Promise<void> {
        let parsed = parseGitUrl(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        await bb.repositories.createIssueChange({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString(),
            _body: {
                type: 'issue_change',
                changes: {
                    component: {
                        new: newComponent
                    }
                }
            }
        });
    }

    export async function postComment(issue: BitbucketIssue, content: string): Promise<void> {
        let parsed = parseGitUrl(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        await bb.repositories.createIssueComment({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString(),
            _body: {
                type: 'issue_comment',
                content: {
                    raw: content
                }
            }
        });
    }

    export async function assign(issue: BitbucketIssue, account_id: string): Promise<void> {
        let parsed = parseGitUrl(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;
        await bb.repositories.updateIssue({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString(),
            _body: {
                type: 'issue',
                assignee: {
                    type: 'user',
                    account_id: account_id
                }
            }
        });
    }

    export async function create(href: string, title: string, description: string, kind: string, priority: string): Promise<BitbucketIssue> {
        let parsed = parseGitUrl(href);
        const bb: Bitbucket = await clientForHostname(parsed.resource) as Bitbucket;

        const { data } = await bb.repositories.createIssue({
            repo_slug: parsed.name,
            username: parsed.owner,
            _body: {
                type: 'issue',
                title: title,
                content: {
                    raw: description
                },
                //@ts-ignore
                kind: kind, priority: priority
            }
        });

        return data;
    }

    export async function nextPage({ repository, remote, next }: PaginatedBitbucketIssues): Promise<PaginatedBitbucketIssues> {
        const bb: Bitbucket = await clientForRemote(remote) as Bitbucket;
        const { data } = await bb.getNextPage({ next: next });
        //@ts-ignore
        return { repository: repository, remote: remote, data: data.values || [], next: data.next };
    }

    // ---- END - Issue specific actions ----

}
