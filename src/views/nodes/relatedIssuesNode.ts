import * as vscode from 'vscode';
import { AbstractBaseNode } from './abstractBaseNode';
import { StaticIssuesNode } from '../jira/staticIssuesNode';
import { IssueNode } from './issueNode';
import { PullRequest } from '../../bitbucket/model';
import { Container } from '../../container';
import { extractIssueKeys } from '../../bitbucket/issueKeysExtractor';
import { ProductJira } from '../../atlclients/authInfo';

export class RelatedIssuesNode extends AbstractBaseNode {
    private _delegate: StaticIssuesNode;

    private constructor() {
        super();
    }

    public static async create(pr: PullRequest, commits: Bitbucket.Schema.Commit[], allComments: Bitbucket.Schema.Comment[]): Promise<AbstractBaseNode | undefined> {
        // TODO: [VSCODE-503] handle related issues across cloud/server
        if (!await Container.authManager.isProductAuthenticated(ProductJira) || !Container.config.bitbucket.explorer.relatedJiraIssues.enabled) {
            return undefined;
        }
        const issueKeys = await extractIssueKeys(pr, commits, allComments);
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
}