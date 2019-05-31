import { Repository, Remote } from "../typings/git";
import { RepositoriesApi } from "./repositories";
import { GitUrlParse, bitbucketHosts, PullRequestApi } from "./pullRequests";
import { PaginatedBitbucketIssues, PaginatedComments, PaginatedIssueChange } from "./model";

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
        let remotes = PullRequestApi.getBitbucketRemotes(repository);
        if (remotes.length === 0 || !await bitbucketIssuesEnabled(remotes[0])) {
            return { repository: repository, remote: dummyRemote, data: [], next: undefined };
        }

        let parsed = GitUrlParse(RepositoriesApi.urlForRemote(remotes[0]));
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);

        const { data } = await bb.repositories.listIssues({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: defaultPageLength,
            q: 'state="new" OR state="open" OR state="on hold"'
        });

        return { repository: repository, remote: remotes[0], data: data.values || [], next: data.next };
    }

    export async function getAvailableComponents(repositoryHref: string): Promise<Bitbucket.Schema.Component[] | undefined> {
        let parsed = GitUrlParse(repositoryHref);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);

        const resp = await bb.repositories.listComponents({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: defaultPageLength
        });

        return resp.data.values;
    }

    export async function getIssuesForKeys(repository: Repository, issueKeys: string[]): Promise<Bitbucket.Schema.Issue[]> {
        let remotes = PullRequestApi.getBitbucketRemotes(repository);
        if (remotes.length === 0 || !await bitbucketIssuesEnabled(remotes[0])) {
            return [];
        }

        let parsed = GitUrlParse(RepositoriesApi.urlForRemote(remotes[0]));
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);

        const keyNumbers = issueKeys.map(key => key.replace('#', ''));
        const results = await Promise.all(keyNumbers.map(key => bb.repositories.getIssue({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: key
        })));
        return results.map(result => result.data || []);
    }

    export async function getLatest(repository: Repository): Promise<PaginatedBitbucketIssues> {
        let remotes = PullRequestApi.getBitbucketRemotes(repository);
        if (remotes.length === 0 || !await bitbucketIssuesEnabled(remotes[0])) {
            return { repository: repository, remote: dummyRemote, data: [], next: undefined };
        }

        let parsed = GitUrlParse(RepositoriesApi.urlForRemote(remotes[0]));
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
        const { data } = await bb.repositories.listIssues({
            repo_slug: parsed.name,
            username: parsed.owner,
            pagelen: 1,
            q: '(state="new" OR state="open" OR state="on hold")',
            sort: '-created_on'
        });

        return { repository: repository, remote: remotes[0], data: data.values || [], next: data.next };
    }

    export async function bitbucketIssuesEnabled(remote: Remote): Promise<boolean> {
        return !!(await RepositoriesApi.get(remote)).issueTrackerEnabled;
    }

    // ---- END - Actions NOT on a specific issue ----


    // ---- BEGIN - Issue specific actions ----
    // ---- => Bitbucket Issues enabled for the repo

    export async function refetch(issue: Bitbucket.Schema.Issue): Promise<Bitbucket.Schema.Issue> {
        let parsed = GitUrlParse(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
        const { data } = await bb.repositories.getIssue({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString()
        });

        return data;
    }

    export async function getComments(issue: Bitbucket.Schema.Issue): Promise<PaginatedComments> {
        let parsed = GitUrlParse(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
        const { data } = await bb.repositories.listIssueComments({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString(),
            pagelen: maxItemsSupported.comments,
            sort: '-created_on'
        });

        return { data: (data.values || []).reverse(), next: data.next };
    }

    export async function getChanges(issue: Bitbucket.Schema.Issue): Promise<PaginatedIssueChange> {
        let parsed = GitUrlParse(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
        const { data } = await bb.repositories.listIssueChanges({
            repo_slug: parsed.name,
            username: parsed.owner,
            issue_id: issue.id!.toString(),
            pagelen: maxItemsSupported.changes,
            sort: '-created_on'
        });

        return { data: (data.values || []).reverse(), next: data.next };
    }

    export async function postChange(issue: Bitbucket.Schema.Issue, newStatus: string, content?: string): Promise<void> {
        let parsed = GitUrlParse(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
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

    export async function postNewComponent(issue: Bitbucket.Schema.Issue, newComponent: string): Promise<void> {
        let parsed = GitUrlParse(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
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

    export async function postComment(issue: Bitbucket.Schema.Issue, content: string): Promise<void> {
        let parsed = GitUrlParse(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
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

    export async function assign(issue: Bitbucket.Schema.Issue, account_id: string): Promise<void> {
        let parsed = GitUrlParse(issue.repository!.links!.html!.href!);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
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

    export async function create(href: string, title: string, description: string, kind: string, priority: string): Promise<Bitbucket.Schema.Issue> {
        let parsed = GitUrlParse(href);
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);

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
        let parsed = GitUrlParse(RepositoriesApi.urlForRemote(remote));
        const bb: Bitbucket = await bitbucketHosts.get(parsed.source);
        const { data } = await bb.getNextPage({ next: next });
        //@ts-ignore
        return { repository: repository, remote: remote, data: data.values || [], next: data.next };
    }

    // ---- END - Issue specific actions ----

}
