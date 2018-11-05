import * as vscode from 'vscode';
import { fetchPullRequestsCommand } from './commands/bitbucket/fetchPullRequests';
import { authenticateBitbucket } from './commands/authenticate';
import { currentUserBitbucket } from './commands//bitbucket/currentUser';
import { currentUserJira } from './commands//jira/currentUser';
import { authenticateJira } from './commands/authenticate';
import { BitbucketContext } from './bitbucket/context';
import { PullRequestNodeDataProvider } from './views/pullRequestNodeDataProvider';
import { BaseNode } from './views/nodes/baseNode';
import { PullRequestReactPanel } from './webviews/pullRequestWebView';
import { JiraContext } from './jira/context';
import { refreshExplorer } from './commands/jira/refreshExplorer';
import { showProjectSelectionDialog } from './commands/jira/selectProject';
import { ConfigReactPanel } from './webviews/configWebview';

export enum Commands {
    BitbucketFetchPullRequests = 'atlascode.bb.fetchPullRequests',
    BitbucketRefreshPullRequests = 'atlascode.bb.refreshPullRequests',
    BitbucketShowPullRequestDetails = 'atlascode.bb.showPullReqeustDetails',
    AuthenticateBitbucket = 'atlascode.bb.authenticate',
    CurrentUserBitbucket = 'atlascode.bb.me',
    currentUserJira = 'atlascode.jira.me',
    AuthenticateJira = 'atlascode.jira.authenticate',
    SelectProject = 'atlascode.jira.selectProject',
    RefreshExplorer = 'atlascode.jira.refreshExplorer',
    ShowConfigPage = 'atlascode.showConfigPage'
}

export function registerCommands(vscodeContext: vscode.ExtensionContext, bbContext: BitbucketContext) {
    let prNodeDataProvider = new PullRequestNodeDataProvider(bbContext);
    vscodeContext.subscriptions.push(vscode.window.registerTreeDataProvider<BaseNode>('atlascode.views.bb.pullrequestsTreeView', prNodeDataProvider));

    vscodeContext.subscriptions.push(
        vscode.commands.registerCommand(Commands.BitbucketFetchPullRequests, fetchPullRequestsCommand, bbContext),
        vscode.commands.registerCommand(Commands.BitbucketRefreshPullRequests, prNodeDataProvider.refresh, prNodeDataProvider),
        vscode.commands.registerCommand(Commands.BitbucketShowPullRequestDetails, async (pr) => {
            PullRequestReactPanel.createOrShow(vscodeContext.extensionPath);
            await PullRequestReactPanel.currentPanel!.updatePullRequest(pr);
        }),
        vscode.commands.registerCommand(Commands.AuthenticateBitbucket, authenticateBitbucket),
        vscode.commands.registerCommand(Commands.CurrentUserBitbucket, currentUserBitbucket),
        vscode.commands.registerCommand(Commands.ShowConfigPage, () => ConfigReactPanel.createOrShow(vscodeContext.extensionPath))
    );
}

export function registerJiraCommands(vscodeContext: vscode.ExtensionContext, jiraContext: JiraContext) {
    vscodeContext.subscriptions.push(
        vscode.commands.registerCommand(Commands.currentUserJira, currentUserJira),
        vscode.commands.registerCommand(Commands.AuthenticateJira, authenticateJira),
        vscode.commands.registerCommand(Commands.SelectProject, showProjectSelectionDialog),
        vscode.commands.registerCommand(Commands.RefreshExplorer, () => refreshExplorer(jiraContext.assignedTree, jiraContext.openTree))
    );
}
