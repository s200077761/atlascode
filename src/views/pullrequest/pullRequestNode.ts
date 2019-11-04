import * as vscode from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketSite, Comment, Commit, FileChange, FileStatus, PaginatedComments, PaginatedPullRequests, PullRequest, User } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { Logger } from '../../logger';
import { Resources } from '../../resources';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { RelatedBitbucketIssuesNode } from '../nodes/relatedBitbucketIssuesNode';
import { RelatedIssuesNode } from '../nodes/relatedIssuesNode';
import { SimpleNode } from '../nodes/simpleNode';
import { DiffViewArgs, getArgsForDiffView } from './diffViewHelper';
import { PullRequestCommentController } from './prCommentController';

export const PullRequestContextValue = 'pullrequest';

export interface FileDiffQueryParams {
    lhs: boolean;
    repoUri: string;
    branchName: string;
    commitHash: string;
    path: string;
}

export interface PRFileDiffQueryParams extends FileDiffQueryParams {
    site: BitbucketSite;
    prHref: string;
    prId: number;
    participants: User[];
    commentThreads: Comment[][];
}

export class PullRequestTitlesNode extends AbstractBaseNode {
    private treeItem: vscode.TreeItem;
    public prHref: string;

    constructor(private pr: PullRequest, private commentController: PullRequestCommentController) {
        super();
        this.treeItem = this.createTreeItem();
        this.prHref = pr.data!.url;
    }

    private createTreeItem(): vscode.TreeItem {
        const approvalText = this.pr.data.participants
            .filter(p => p.status === 'APPROVED')
            .map(approver => `Approved-by: ${approver.displayName}`)
            .join('\n');

        let item = new vscode.TreeItem(`#${this.pr.data.id!} ${this.pr.data.title!}`, vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = `#${this.pr.data.id!} ${this.pr.data.title!}${approvalText.length > 0 ? `\n\n${approvalText}` : ''}`;
        item.iconPath = vscode.Uri.parse(this.pr.data!.author!.avatarUrl);
        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(this.pr.data.url);

        return item;
    }


    getTreeItem(): vscode.TreeItem {
        return this.treeItem;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (!element) {
            if (!this.pr) { return []; }

            this.pr = await this.hydratePullRequest(this.pr);

            const bbApi = await clientForSite(this.pr.site);
            let promises = Promise.all([
                bbApi.pullrequests.getChangedFiles(this.pr),
                bbApi.pullrequests.getCommits(this.pr),
                bbApi.pullrequests.getComments(this.pr)
            ]);

            return promises.then(
                async result => {
                    let [fileChanges, commits, allComments] = result;

                    const children: AbstractBaseNode[] = [new DescriptionNode(this.pr)];
                    children.push(...await this.createRelatedJiraIssueNode(commits, allComments));
                    children.push(...await this.createRelatedBitbucketIssueNode(commits, allComments));
                    children.push(...await this.createFileChangesNodes(allComments, fileChanges));
                    return children;
                },
                reason => {
                    Logger.debug('error fetching pull request details', reason);
                    return [new SimpleNode('⚠️ Error: fetching pull request details failed')];
                });
        } else {
            return element.getChildren();
        }
    }

    // hydratePullRequest fetches the specific pullrequest by id to fill in the missing details.
    // This is needed because when a repo's pullrequests list is fetched, the response may not have all fields populated.
    private async hydratePullRequest(pr: PullRequest): Promise<PullRequest> {
        const bbApi = await clientForSite(this.pr.site);
        return await bbApi.pullrequests.get(pr);
    }

    private async createRelatedJiraIssueNode(commits: Commit[], allComments: PaginatedComments): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        const relatedIssuesNode = await RelatedIssuesNode.create(this.pr, commits, allComments.data);
        if (relatedIssuesNode) {
            result.push(relatedIssuesNode);
        }
        return result;
    }

    private async createRelatedBitbucketIssueNode(commits: Commit[], allComments: PaginatedComments): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        const relatedIssuesNode = await RelatedBitbucketIssuesNode.create(this.pr, commits, allComments.data);
        if (relatedIssuesNode) {
            result.push(relatedIssuesNode);
        }
        return result;
    }

    private async createFileChangesNodes(allComments: PaginatedComments, fileChanges: FileChange[]): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        result.push(
            ...await Promise.all(
                fileChanges.map(async (fileChange) => {
                    const diffViewData = await getArgsForDiffView(allComments, fileChange, this.pr, this.commentController);
                    return new PullRequestFilesNode(diffViewData);
                }
                )
            )
        );
        if (allComments.next) {
            result.push(new SimpleNode('⚠️ All file comments are not shown. This PR has more comments than what is supported by this extension.'));
        }
        return result;
    }
}

class PullRequestFilesNode extends AbstractBaseNode {

    constructor(private diffViewData: DiffViewArgs) {
        super();
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        let itemData = this.diffViewData.fileDisplayData;
        let item = new vscode.TreeItem(`${itemData.numberOfComments > 0 ? '💬 ' : ''}${itemData.fileDisplayName}`, vscode.TreeItemCollapsibleState.None);
        item.tooltip = itemData.fileDisplayName;
        item.command = {
            command: Commands.ViewDiff,
            title: 'Diff file',
            arguments: this.diffViewData.diffArgs
        };

        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(`${itemData.prUrl}#chg-${itemData.fileDisplayName}`);
        switch (itemData.fileChangeStatus) {
            case FileStatus.ADDED:
                item.iconPath = Resources.icons.get('add');
                break;
            case FileStatus.DELETED:
                item.iconPath = Resources.icons.get('delete');
                break;
            //@ts-ignore
            case FileStatus.CONFLICT:
                item.iconPath = Resources.icons.get('warning');
                break;
            default:
                item.iconPath = Resources.icons.get('edit');
                break;
        }

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}

class DescriptionNode extends AbstractBaseNode {
    constructor(private pr: PullRequest) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem('Details', vscode.TreeItemCollapsibleState.None);
        item.tooltip = 'Open pull request details';
        item.iconPath = Resources.icons.get('detail');

        item.command = {
            command: Commands.BitbucketShowPullRequestDetails,
            title: 'Open pull request details',
            arguments: [this.pr]
        };

        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(this.pr.data.url);

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}

export class NextPageNode extends AbstractBaseNode {
    constructor(private prs: PaginatedPullRequests) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem('Load next page', vscode.TreeItemCollapsibleState.None);
        item.iconPath = Resources.icons.get('more');

        item.command = {
            command: Commands.BitbucketPullRequestsNextPage,
            title: 'Load pull requests next page',
            arguments: [this.prs]
        };

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}