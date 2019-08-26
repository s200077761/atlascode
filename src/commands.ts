import * as vscode from 'vscode';
import { showProjectSelectionDialog } from './commands/jira/selectProject';
import { showSiteSelectionDialog } from './commands/jira/selectSite';
import { Container } from './container';
import { assignIssue } from './commands/jira/assignIssue';
import { IssueNode } from './views/nodes/issueNode';
import { AbstractBaseNode } from './views/nodes/abstractBaseNode';
import { viewScreenEvent, Registry } from './analytics';
import { showIssue } from './commands/jira/showIssue';
import { createIssue } from './commands/jira/createIssue';
import { BitbucketIssue } from './bitbucket/model';
import { MinimalIssue, isMinimalIssue, MinimalIssueOrKeyAndSiteOrKey } from './jira/jira-client/model/entities';
import { startWorkOnIssue } from './commands/jira/startWorkOnIssue';

export enum Commands {
    BitbucketSelectContainer = 'atlascode.bb.selectContainer',
    BitbucketFetchPullRequests = 'atlascode.bb.fetchPullRequests',
    BitbucketRefreshPullRequests = 'atlascode.bb.refreshPullRequests',
    BitbucketShowOpenPullRequests = 'atlascode.bb.showOpenPullRequests',
    BitbucketShowPullRequestsToReview = 'atlascode.bb.showPullRequestsToReview',
    BitbucketShowPullRequestsCreatedByMe = 'atlascode.bb.showOpenPullRequestsCreatedByMe',
    BitbucketPullRequestFilters = 'atlascode.bb.showPullRequestFilters',
    BitbucketShowPullRequestDetails = 'atlascode.bb.showPullRequestDetails',
    BitbucketPullRequestsNextPage = 'atlascode.bb.pullReqeustsNextPage',
    ViewInWebBrowser = 'atlascode.viewInWebBrowser',
    BitbucketAddComment = 'atlascode.bb.addComment',
    BitbucketToggleCommentsVisibility = 'atlascode.bb.toggleCommentsVisibility',
    SelectProject = 'atlascode.jira.selectProject',
    SelectSite = 'atlascode.jira.selectSite',
    CreateIssue = 'atlascode.jira.createIssue',
    RefreshJiraExplorer = 'atlascode.jira.refreshExplorer',
    ShowIssue = 'atlascode.jira.showIssue',
    ShowConfigPage = 'atlascode.showConfigPage',
    ShowWelcomePage = 'atlascode.showWelcomePage',
    AssignIssueToMe = 'atlascode.jira.assignIssueToMe',
    StartWorkOnIssue = 'atlascode.jira.startWorkOnIssue',
    CreatePullRequest = 'atlascode.bb.createPullRequest',
    StartPipeline = 'atlascode.bb.startPipeline',
    RefreshPipelines = 'atlascode.bb.refreshPipelines',
    ShowPipeline = 'atlascode.bb.showPipeline',
    PipelinesNextPage = 'atlascode.bb.pipelinesNextPage',
    BitbucketIssuesNextPage = 'atlascode.bb.issuesNextPage',
    BitbucketIssuesRefresh = 'atlascode.bb.refreshIssues',
    CreateBitbucketIssue = 'atlascode.bb.createIssue',
    ShowBitbucketIssue = 'atlascode.bb.showIssue',
    StartWorkOnBitbucketIssue = 'atlascode.bb.startWorkOnIssue',
    ViewDiff = 'atlascode.viewDiff'
}

export function registerCommands(vscodeContext: vscode.ExtensionContext) {
    vscodeContext.subscriptions.push(
        vscode.commands.registerCommand(Commands.ShowConfigPage, Container.configWebview.createOrShow, Container.configWebview),
        vscode.commands.registerCommand(Commands.ShowWelcomePage, Container.welcomeWebview.createOrShow, Container.welcomeWebview),
        vscode.commands.registerCommand(Commands.ViewInWebBrowser, async (prNode: AbstractBaseNode) => vscode.commands.executeCommand('vscode.open', (await prNode.getTreeItem()).resourceUri)),
        vscode.commands.registerCommand(Commands.SelectProject, showProjectSelectionDialog),
        vscode.commands.registerCommand(Commands.SelectSite, showSiteSelectionDialog),
        vscode.commands.registerCommand(Commands.CreateIssue, (data: any) => createIssue(data)),
        vscode.commands.registerCommand(Commands.ShowIssue, async (issueOrKey: MinimalIssueOrKeyAndSiteOrKey) => await showIssue(issueOrKey)),
        vscode.commands.registerCommand(Commands.AssignIssueToMe, (issueNode: IssueNode) => assignIssue(issueNode)),
        vscode.commands.registerCommand(Commands.StartWorkOnIssue, (issueNodeOrMinimalIssue: IssueNode | MinimalIssue) => startWorkOnIssue(isMinimalIssue(issueNodeOrMinimalIssue) ? issueNodeOrMinimalIssue : issueNodeOrMinimalIssue.issue)),
        vscode.commands.registerCommand(Commands.StartWorkOnBitbucketIssue, (issue: BitbucketIssue) => Container.startWorkOnBitbucketIssueWebview.createOrShowIssue(issue)),
        vscode.commands.registerCommand(Commands.ViewDiff, async (...diffArgs: [() => {}, vscode.Uri, vscode.Uri, string]) => {
            viewScreenEvent(Registry.screen.pullRequestDiffScreen).then(e => { Container.analyticsClient.sendScreenEvent(e); });
            diffArgs[0]();
            vscode.commands.executeCommand('vscode.diff', ...diffArgs.slice(1));
        }),
        vscode.commands.registerCommand(Commands.ShowPipeline, (pipelineInfo: any) => {
            Container.pipelineViewManager.createOrShow(pipelineInfo);
        }),
        vscode.commands.registerCommand(Commands.ShowBitbucketIssue, (issue: BitbucketIssue) => Container.bitbucketIssueViewManager.createOrShow(issue))
    );
}
