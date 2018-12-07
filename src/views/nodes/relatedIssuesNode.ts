import * as vscode from 'vscode';
import { BaseNode } from '../nodes/baseNode';
import { StaticIssuesNode } from '../jira/staticIssuesNode';
import { IssueNode } from './issueNode';
import { PullRequest } from '../../bitbucket/model';
import { GitBackend } from '../../codebucket/backend/backend-git';
import { parseJiraIssueKeys } from '../../jira/issueKeyParser';
import { Container } from '../../container';

export class RelatedIssuesNode extends BaseNode {
    private _delegate: StaticIssuesNode;

    private constructor() {
        super();
    }

    public static async create(pr: PullRequest, allComments: Bitbucket.Schema.Comment[]): Promise<BaseNode | undefined> {
        if (!Container.config.bitbucket.explorer.relatedJiraIssues.enabled) {
            return undefined;
        }
        const issueKeys = await RelatedIssuesNode.getRelatedIssueKeys(pr, allComments);
        if (issueKeys.length > 0) {
            const node = new RelatedIssuesNode();
            node._delegate = new StaticIssuesNode(issueKeys, 'Related Jira issues');
            return node;
        }
        return undefined;
    }

    getTreeItem(): vscode.TreeItem {
        return this._delegate.getTreeItem();
    }
    getChildren(element?: IssueNode): Promise<IssueNode[]> {
        return this._delegate.getChildren(element);
    }

    private static async getRelatedIssueKeys(pr: PullRequest, allComments: Bitbucket.Schema.Comment[]): Promise<string[]> {
        const result = new Set<string>();

        const b = new GitBackend(pr.repository.rootUri.fsPath);
        const text = await b.getRevisionMessage(`${pr.data.destination!.commit!.hash!}..${pr.data.source!.commit!.hash!}`);
        const commitMessageMatches = parseJiraIssueKeys(text);
        commitMessageMatches.forEach(m => result.add(m));

        const prTitleMatches = parseJiraIssueKeys(pr.data.title!);
        prTitleMatches.forEach(m => result.add(m));

        const prSummaryMatches = parseJiraIssueKeys(pr.data.summary!.raw!);
        prSummaryMatches.forEach(m => result.add(m));

        const prCommentsMatches = allComments.map(c => parseJiraIssueKeys(c.content!.raw!)).reduce((prev, curr) => prev.concat(curr), []);
        prCommentsMatches.forEach(m => result.add(m));

        return Array.from(result);
    }
}