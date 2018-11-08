import * as vscode from 'vscode';
import { authenticateBitbucket } from './commands/authenticate';
import { currentUserBitbucket } from './commands//bitbucket/currentUser';
import { currentUserJira } from './commands//jira/currentUser';
import { authenticateJira } from './commands/authenticate';
import { BitbucketContext } from './bitbucket/context';
import { PullRequestNodeDataProvider } from './views/pullRequestNodeDataProvider';
import { BaseNode } from './views/nodes/baseNode';
import { JiraContext } from './jira/context';
import { refreshExplorer } from './commands/jira/refreshExplorer';
import { showProjectSelectionDialog } from './commands/jira/selectProject';
import { showSiteSelectionDialog } from './commands/jira/selectSite';
import { IssueHoverProvider } from './views/jira/issueHoverProvider';
import { Container } from './container';
import { PullRequestApi } from './bitbucket/pullRequests';
import { PaginatedPullRequests } from './bitbucket/model';

export enum Commands {
    BitbucketFetchPullRequests = 'atlascode.bb.fetchPullRequests',
    BitbucketRefreshPullRequests = 'atlascode.bb.refreshPullRequests',
    BitbucketShowPullRequestDetails = 'atlascode.bb.showPullRequestDetails',
    BitbucketPullRequestsNextPage = 'atlascode.bb.pullReqeustsNextPage',
    AuthenticateBitbucket = 'atlascode.bb.authenticate',
    CurrentUserBitbucket = 'atlascode.bb.me',
    currentUserJira = 'atlascode.jira.me',
    AuthenticateJira = 'atlascode.jira.authenticate',
    SelectProject = 'atlascode.jira.selectProject',
    SelectSite = 'atlascode.jira.selectSite',
    RefreshExplorer = 'atlascode.jira.refreshExplorer',
    ShowIssue = 'atlascode.jira.showIssue',
    ShowIssueByKey = 'atlascode.jira.showIssueByKey',
    ShowConfigPage = 'atlascode.showConfigPage'
}

export function registerCommands(vscodeContext: vscode.ExtensionContext, bbContext: BitbucketContext) {
    let prNodeDataProvider = new PullRequestNodeDataProvider(bbContext);
    vscodeContext.subscriptions.push(vscode.window.registerTreeDataProvider<BaseNode>('atlascode.views.bb.pullrequestsTreeView', prNodeDataProvider));

    vscodeContext.subscriptions.push(
        vscode.commands.registerCommand(Commands.BitbucketRefreshPullRequests, prNodeDataProvider.refresh, prNodeDataProvider),
        vscode.commands.registerCommand(Commands.BitbucketShowPullRequestDetails, async (pr) => {
            await Container.pullRequestViewManager.createOrShow(pr);
        }),
        vscode.commands.registerCommand(Commands.BitbucketPullRequestsNextPage, async (prs: PaginatedPullRequests) => {
            const result = await PullRequestApi.nextPage(prs);
            prNodeDataProvider.addItems(result);
        }),
        vscode.commands.registerCommand(Commands.AuthenticateBitbucket, authenticateBitbucket),
        vscode.commands.registerCommand(Commands.CurrentUserBitbucket, currentUserBitbucket),
        vscode.commands.registerCommand(Commands.ShowConfigPage, Container.configWebview.createOrShow, Container.configWebview)
    );
}

export function registerJiraCommands(vscodeContext: vscode.ExtensionContext, jiraContext: JiraContext) {
    vscodeContext.subscriptions.push(
        vscode.commands.registerCommand(Commands.currentUserJira, currentUserJira),
        vscode.commands.registerCommand(Commands.AuthenticateJira, authenticateJira),
        vscode.commands.registerCommand(Commands.SelectProject, showProjectSelectionDialog),
        vscode.commands.registerCommand(Commands.SelectSite, showSiteSelectionDialog),
        vscode.commands.registerCommand(Commands.RefreshExplorer, () => refreshExplorer(jiraContext.assignedTree, jiraContext.openTree)),
        vscode.commands.registerCommand(Commands.ShowIssue, async (issue) => {
            await Container.jiraIssueViewManager.createOrShow(issue);
        }),
        vscode.languages.registerHoverProvider({ scheme: 'file' }, new IssueHoverProvider())
    );
}
