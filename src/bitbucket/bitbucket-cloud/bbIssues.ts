import { AxiosResponse } from 'axios';
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { getAgent } from '../../jira/jira-client/providers';
import { Client, ClientError } from "../httpClient";
import { BitbucketIssue, BitbucketSite, Comment, emptyBitbucketSite, PaginatedBitbucketIssues, PaginatedComments, UnknownUser, WorkspaceRepo } from "../model";

const defaultPageLength = 25;
export const maxItemsSupported = {
    comments: 100,
    changes: 100
};

export class BitbucketIssuesApiImpl {
    private client: Client;

    constructor(site: DetailedSiteInfo, token: string) {
        this.client = new Client(
            site.baseApiUrl,
            `Bearer ${token}`,
            getAgent(site),
            async (response: AxiosResponse): Promise<Error> => {
                let errString = 'Unknown error';
                const errJson = response.data;

                if (errJson.error && errJson.error.message) {
                    errString = errJson.error.message;
                } else {
                    errString = errJson;
                }

                return new ClientError(response.statusText, errString);
            }
        );
    }

    // ---- BEGIN - Actions NOT on a specific issue ----
    // ---- => ensure Bitbucket issues are enabled for the repo

    async getList(workspaceRepo: WorkspaceRepo): Promise<PaginatedBitbucketIssues> {
        const site = workspaceRepo.mainSiteRemote.site;
        if (!site) {
            return { workspaceRepo: workspaceRepo, site: emptyBitbucketSite, data: [], next: undefined };
        }

        if (!await this.bitbucketIssuesEnabled(site)) {
            return { workspaceRepo, site, data: [], next: undefined };
        }

        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/issues`,
            {
                pagelen: defaultPageLength,
                q: 'state="new" OR state="open" OR state="on hold"'
            }
        );

        const issues: BitbucketIssue[] = (data.values || []).map((val: any) => ({ site, data: val }));

        return { workspaceRepo, site, data: issues, next: data.next };
    }

    async getAvailableComponents(site: BitbucketSite): Promise<any[] | undefined> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/components`,
            {
                pagelen: defaultPageLength
            }
        );

        return data.values;
    }

    async getIssuesForKeys(site: BitbucketSite, issueKeys: string[]): Promise<BitbucketIssue[]> {
        if (!await this.bitbucketIssuesEnabled(site)) {
            return [];
        }

        const { ownerSlug, repoSlug } = site;

        const keyNumbers = issueKeys.map(key => key.replace('#', ''));

        const results = await Promise.all(keyNumbers.map(key => this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/issues/${key}`
        )));

        return results.filter(result => !!result).map(result => ({ site, data: result.data }));
    }

    async getLatest(workspaceRepo: WorkspaceRepo): Promise<PaginatedBitbucketIssues> {
        const site = workspaceRepo.mainSiteRemote.site;
        if (!site) {
            return { workspaceRepo: workspaceRepo, site: emptyBitbucketSite, data: [], next: undefined };
        }

        if (!await this.bitbucketIssuesEnabled(site)) {
            return { workspaceRepo, site, data: [], next: undefined };
        }

        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/issues`,
            {
                pagelen: 2,
                q: '(state="new" OR state="open" OR state="on hold")',
                sort: '-created_on'
            }
        );

        const issues: BitbucketIssue[] = (data.values || []).map((val: any) => ({ site, data: val }));

        return { workspaceRepo, site, data: issues, next: data.next };
    }

    async bitbucketIssuesEnabled(site: BitbucketSite): Promise<boolean> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}`
        );

        return !!data.has_issues;
    }

    // ---- END - Actions NOT on a specific issue ----


    // ---- BEGIN - Issue specific actions ----
    // ---- => Bitbucket issues enabled for the repo

    async refetch(issue: BitbucketIssue): Promise<BitbucketIssue> {
        const { ownerSlug, repoSlug } = issue.site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}`,
        );

        return { ...issue, data: data };
    }

    async getComments(issue: BitbucketIssue): Promise<PaginatedComments> {
        const { ownerSlug, repoSlug } = issue.site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}/comments`,
            {
                issue_id: issue.data.id!.toString(),
                pagelen: maxItemsSupported.comments,
                sort: '-created_on'
            }
        );

        return {
            data: (data.values || []).reverse().map((comment: any) => ({
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
                        avatarUrl: comment.user.links!.avatar!.href!,
                        mention: `@[${comment.user.display_name!}](account_id:${comment.user.account_id!})`
                    }
                    : UnknownUser,
                children: []
            })),
            next: data.next
        };
    }

    async getChanges(issue: BitbucketIssue): Promise<PaginatedComments> {
        const { ownerSlug, repoSlug } = issue.site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}/changes`,
            {
                pagelen: maxItemsSupported.changes,
                sort: '-created_on'
            }
        );

        const changes: any[] = (data.values || []).reverse();

        const updatedChanges: any[] = changes
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
            id: change.id as string,
            htmlContent: change.message!.html!,
            rawContent: change.message!.raw!,
            deleted: false,
            deletable: true,
            editable: true,
            ts: change.created_on!,
            updatedTs: change.created_on!,
            user: change.user
                ? {
                    accountId: change.user.account_id!,
                    displayName: change.user.display_name!,
                    url: change.user.links!.html!.href!,
                    avatarUrl: change.user.links!.avatar!.href!,
                    mention: `@[${change.user.display_name!}](account_id:${change.user.account_id})`
                }
                : UnknownUser,
            children: [],
            tasks: []
        }));

        return { data: updatedChangesAsComments, next: data.next };
    }

    async postChange(issue: BitbucketIssue, newStatus: string, content?: string): Promise<void> {
        const { ownerSlug, repoSlug } = issue.site;

        await this.client.post(
            `/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}/changes`,
            {
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
        );
    }

    async postNewComponent(issue: BitbucketIssue, newComponent: string): Promise<void> {
        const { ownerSlug, repoSlug } = issue.site;

        await this.client.post(
            `/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}/changes`,
            {
                type: 'issue_change',
                changes: {
                    component: {
                        new: newComponent
                    }
                }
            }
        );
    }

    async postComment(issue: BitbucketIssue, content: string): Promise<void> {
        const { ownerSlug, repoSlug } = issue.site;

        await this.client.post(
            `/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}/comments`,
            {
                type: 'issue_comment',
                content: {
                    raw: content
                }
            }
        );
    }

    async assign(issue: BitbucketIssue, account_id: string): Promise<void> {
        const { ownerSlug, repoSlug } = issue.site;

        await this.client.put(
            `/repositories/${ownerSlug}/${repoSlug}/issues/${issue.data.id}`,
            {
                type: 'issue',
                assignee: {
                    type: 'user',
                    account_id: account_id
                }
            }
        );
    }

    async create(site: BitbucketSite, title: string, description: string, kind: string, priority: string): Promise<BitbucketIssue> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.post(
            `/repositories/${ownerSlug}/${repoSlug}/issues`,
            {
                type: 'issue',
                title: title,
                content: {
                    raw: description
                },
                //@ts-ignore
                kind: kind, priority: priority
            }
        );

        return { site, data };
    }

    async nextPage({ workspaceRepo, site, next }: PaginatedBitbucketIssues): Promise<PaginatedBitbucketIssues> {
        const { data } = await this.client.get(next!);

        const issues: BitbucketIssue[] = (data.values || []).map((val: any) => ({ site, data: val }));

        return { workspaceRepo, site, data: issues || [], next: data.next };
    }

    // ---- END - Issue specific actions ----

}
