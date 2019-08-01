import { Repository, Remote } from "../typings/git";
import { getBitbucketRemotes, parseGitUrl, urlForRemote, clientForRemote, firstBitbucketRemote } from "./bbUtils";
import { PaginatedBitbucketIssues, PaginatedComments, UnknownUser, Comment, BitbucketIssue } from "./model";

const defaultPageLength = 25;
export const maxItemsSupported = {
    comments: 100,
    changes: 100
};
const dummyRemote = { name: '', isReadOnly: true };

export class BitbucketIssuesApiImpl {

    constructor(private _client: Bitbucket) { }

    // ---- BEGIN - Actions NOT on a specific issue ----
    // ---- => ensure Bitbucket Issues are enabled for the repo

    async getList(repository: Repository): Promise<PaginatedBitbucketIssues> {
        let remotes = getBitbucketRemotes(repository);
        if (remotes.length === 0) {
            return { repository: repository, remote: dummyRemote, data: [], next: undefined };
        }
        const remote = firstBitbucketRemote(repository);
        if (!await this.bitbucketIssuesEnabled(remote)) {
            return { repository: repository, remote: dummyRemote, data: [], next: undefined };
        }

        let parsed = parseGitUrl(urlForRemote(remote));

        const { data } = await this._client.repositories.listIssues({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: defaultPageLength,
            q: 'state="new" OR state="open" OR state="on hold"'
        });

        const issues: BitbucketIssue[] = (data.values || []).map(val => ({ repository: repository, remote: remote, data: val }));

        return { repository: repository, remote: remote, data: issues, next: data.next };
    }

    async getAvailableComponents(repositoryHref: string): Promise<Bitbucket.Schema.Component[] | undefined> {
        let parsed = parseGitUrl(repositoryHref);

        const resp = await this._client.repositories.listComponents({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: defaultPageLength
        });

        return resp.data.values;
    }

    async getIssuesForKeys(repository: Repository, issueKeys: string[]): Promise<BitbucketIssue[]> {
        let remotes = getBitbucketRemotes(repository);
        if (remotes.length === 0) {
            return [];
        }
        const remote = firstBitbucketRemote(repository);

        if (!await this.bitbucketIssuesEnabled(remote)) {
            return [];
        }

        let parsed = parseGitUrl(urlForRemote(remote));

        const keyNumbers = issueKeys.map(key => key.replace('#', ''));
        const results = await Promise.all(keyNumbers.map(key => this._client.repositories.getIssue({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: key
        })));
        return results.filter(result => !!result).map(result => ({ repository: repository, remote: remote, data: result.data }));
    }

    async getLatest(repository: Repository): Promise<PaginatedBitbucketIssues> {
        let remotes = getBitbucketRemotes(repository);

        if (remotes.length === 0) {
            return { repository: repository, remote: dummyRemote, data: [], next: undefined };
        }
        const remote = firstBitbucketRemote(repository);
        if (!await this.bitbucketIssuesEnabled(remote)) {
            return { repository: repository, remote: dummyRemote, data: [], next: undefined };
        }

        let parsed = parseGitUrl(urlForRemote(remote));
        const { data } = await this._client.repositories.listIssues({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: 2,
            q: '(state="new" OR state="open" OR state="on hold")',
            sort: '-created_on'
        });

        const issues: BitbucketIssue[] = (data.values || []).map(val => ({ repository: repository, remote: remote, data: val }));

        return { repository: repository, remote: remote, data: issues, next: data.next };
    }

    async bitbucketIssuesEnabled(remote: Remote): Promise<boolean> {
        const bbClient = await clientForRemote(remote);
        return !!(await bbClient.repositories.get(remote)).issueTrackerEnabled;
    }

    // ---- END - Actions NOT on a specific issue ----


    // ---- BEGIN - Issue specific actions ----
    // ---- => Bitbucket Issues enabled for the repo

    async refetch(issue: BitbucketIssue): Promise<BitbucketIssue> {
        let parsed = parseGitUrl(urlForRemote(issue.remote));
        const { data } = await this._client.repositories.getIssue({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.data.id!.toString()
        });

        return { ...issue, data: data };
    }

    async getComments(issue: BitbucketIssue): Promise<PaginatedComments> {
        let parsed = parseGitUrl(urlForRemote(issue.remote));
        const { data } = await this._client.repositories.listIssueComments({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.data.id!.toString(),
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

    async getChanges(issue: BitbucketIssue): Promise<PaginatedComments> {
        let parsed = parseGitUrl(urlForRemote(issue.remote));
        const { data } = await this._client.repositories.listIssueChanges({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.data.id!.toString(),
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

    async postChange(issue: BitbucketIssue, newStatus: string, content?: string): Promise<void> {
        let parsed = parseGitUrl(urlForRemote(issue.remote));
        await this._client.repositories.createIssueChange({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.data.id!.toString(),
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

    async postNewComponent(issue: BitbucketIssue, newComponent: string): Promise<void> {
        let parsed = parseGitUrl(urlForRemote(issue.remote));
        await this._client.repositories.createIssueChange({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.data.id!.toString(),
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

    async postComment(issue: BitbucketIssue, content: string): Promise<void> {
        let parsed = parseGitUrl(urlForRemote(issue.remote));
        await this._client.repositories.createIssueComment({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.data.id!.toString(),
            _body: {
                type: 'issue_comment',
                content: {
                    raw: content
                }
            }
        });
    }

    async assign(issue: BitbucketIssue, account_id: string): Promise<void> {
        let parsed = parseGitUrl(urlForRemote(issue.remote));
        await this._client.repositories.updateIssue({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.data.id!.toString(),
            _body: {
                type: 'issue',
                assignee: {
                    type: 'user',
                    account_id: account_id
                }
            }
        });
    }

    async create(href: string, title: string, description: string, kind: string, priority: string): Promise<BitbucketIssue> {
        let parsed = parseGitUrl(href);

        const { data } = await this._client.repositories.createIssue({
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

    async nextPage({ repository, remote, next }: PaginatedBitbucketIssues): Promise<PaginatedBitbucketIssues> {
        const { data } = await this._client.getNextPage({ next: next });
        //@ts-ignore
        return { repository: repository, remote: remote, data: data.values || [], next: data.next };
    }

    // ---- END - Issue specific actions ----

}
