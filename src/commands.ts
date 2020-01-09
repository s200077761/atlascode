import { isMinimalIssue, MinimalIssue, MinimalIssueOrKeyAndSite } from 'jira-pi-client';
import { commands, env, ExtensionContext, Uri } from 'vscode';
import { cloneRepositoryButtonEvent, openWorkbenchRepositoryButtonEvent, openWorkbenchWorkspaceButtonEvent, Registry, viewScreenEvent } from './analytics';
import { DetailedSiteInfo, ProductBitbucket } from './atlclients/authInfo';
import { showBitbucketDebugInfo } from './bitbucket/bbDebug';
import { BitbucketIssue } from './bitbucket/model';
import { assignIssue } from './commands/jira/assignIssue';
import { createIssue } from './commands/jira/createIssue';
import { showIssue, showIssueForKey, showIssueForSiteIdAndKey } from './commands/jira/showIssue';
import { startWorkOnIssue } from './commands/jira/startWorkOnIssue';
import { SettingSource } from './config/model';
import { Container } from './container';
import { AbstractBaseNode } from './views/nodes/abstractBaseNode';
import { IssueNode } from './views/nodes/issueNode';

export enum Commands {
    BitbucketSelectContainer = 'atlascode.bb.selectContainer',
    BitbucketFetchPullRequests = 'atlascode.bb.fetchPullRequests',
    BitbucketRefreshPullRequests = 'atlascode.bb.refreshPullRequests',
    BitbucketToggleFileNesting = 'atlascode.bb.toggleFileNesting',
    BitbucketShowOpenPullRequests = 'atlascode.bb.showOpenPullRequests',
    BitbucketShowPullRequestsToReview = 'atlascode.bb.showPullRequestsToReview',
    BitbucketShowPullRequestsCreatedByMe = 'atlascode.bb.showOpenPullRequestsCreatedByMe',
    BitbucketPullRequestFilters = 'atlascode.bb.showPullRequestFilters',
    BitbucketShowPullRequestDetails = 'atlascode.bb.showPullRequestDetails',
    BitbucketPullRequestsNextPage = 'atlascode.bb.pullReqeustsNextPage',
    RefreshPullRequestExplorerNode = 'atlascode.bb.refreshPullRequest',
    ViewInWebBrowser = 'atlascode.viewInWebBrowser',
    BitbucketAddComment = 'atlascode.bb.addComment',
    BitbucketAddReply = 'atlascode.bb.addReply',
    BitbucketDeleteComment = 'atlascode.bb.deleteComment',
    BitbucketEditComment = 'atlascode.bb.editComment',
    BitbucketDeleteTask = 'atlascode.bb.deleteTask',
    BitbucketAddTask = 'atlascode.bb.addTask',
    BitbucketEditTask = 'atlascode.bb.editTask',
    BitbucketMarkTaskComplete = 'atlascode.bb.markTaskComplete',
    BitbucketMarkTaskIncomplete = 'atlascode.bb.markTaskIncomplete',
    BitbucketToggleCommentsVisibility = 'atlascode.bb.toggleCommentsVisibility',
    CreateIssue = 'atlascode.jira.createIssue',
    RefreshJiraExplorer = 'atlascode.jira.refreshExplorer',
    ShowJiraIssueSettings = "atlascode.jira.showJiraIssueSettings",
    ShowPullRequestSettings = "atlascode.bb.showPullRequestSettings",
    ShowPipelineSettings = "atlascode.bb.showPipelineSettings",
    ShowBitbucketIssueSettings = "atlascode.bb.showBitbucketIssueSettings",
    ShowIssue = 'atlascode.jira.showIssue',
    ShowIssueForKey = 'atlascode.jira.showIssueForKey',
    ShowIssueForSiteIdAndKey = 'atlascode.jira.showIssueForSiteIdAndKey',
    ShowConfigPage = 'atlascode.showConfigPage',
    ShowJiraAuth = 'atlascode.showJiraAuth',
    ShowBitbucketAuth = 'atlascode.showBitbucketAuth',
    ShowWelcomePage = 'atlascode.showWelcomePage',
    ShowOnboardingPage = 'atlascode.showOnboardingPage',
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
    BBPRCancelAction = 'atlascode.bb.cancelCommentAction',
    BBPRSaveAction = 'atlascode.bb.saveCommentAction',
    ViewDiff = 'atlascode.viewDiff',
    DebugBitbucketSites = 'atlascode.debug.bitbucketSites',
    WorkbenchOpenRepository = 'atlascode.workbenchOpenRepository',
    WorkbenchOpenWorkspace = 'atlascode.workbenchOpenWorkspace',
    CloneRepository = 'atlascode.cloneRepository'
}

export function registerCommands(vscodeContext: ExtensionContext) {
    vscodeContext.subscriptions.push(
        commands.registerCommand(Commands.ShowConfigPage, () => Container.configWebview.createOrShowConfig(SettingSource.Default)),
        commands.registerCommand(Commands.ShowJiraAuth, () => Container.configWebview.createOrShowConfig(SettingSource.JiraAuth)),
        commands.registerCommand(Commands.ShowBitbucketAuth, () => Container.configWebview.createOrShowConfig(SettingSource.BBAuth)),
        commands.registerCommand(Commands.ShowJiraIssueSettings, () => Container.configWebview.createOrShowConfig(SettingSource.JiraIssue)),
        commands.registerCommand(Commands.ShowPullRequestSettings, () => Container.configWebview.createOrShowConfig(SettingSource.BBPullRequest)),
        commands.registerCommand(Commands.ShowPipelineSettings, () => Container.configWebview.createOrShowConfig(SettingSource.BBPipeline)),
        commands.registerCommand(Commands.ShowBitbucketIssueSettings, () => Container.configWebview.createOrShowConfig(SettingSource.BBIssue)),
        commands.registerCommand(Commands.ShowWelcomePage, () => Container.welcomeWebview.createOrShow()),
        commands.registerCommand(Commands.ShowOnboardingPage, () => Container.onboardingWebview.createOrShow()),
        commands.registerCommand(Commands.ViewInWebBrowser, async (prNode: AbstractBaseNode) => {
            const uri = (await prNode.getTreeItem()).resourceUri;
            if (uri) {
                env.openExternal(uri);
            }
        }),
        commands.registerCommand(Commands.CreateIssue, (data: any) => createIssue(data)),
        commands.registerCommand(Commands.ShowIssue, async (issueOrKeyAndSite: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => await showIssue(issueOrKeyAndSite)),
        commands.registerCommand(Commands.ShowIssueForKey, async (issueKey?: string) => await showIssueForKey(issueKey)),
        commands.registerCommand(Commands.ShowIssueForSiteIdAndKey, async (siteId: string, issueKey: string) => await showIssueForSiteIdAndKey(siteId, issueKey)),
        commands.registerCommand(Commands.AssignIssueToMe, (issueNode: IssueNode) => assignIssue(issueNode)),
        commands.registerCommand(Commands.StartWorkOnIssue, (issueNodeOrMinimalIssue: IssueNode | MinimalIssue<DetailedSiteInfo>) => startWorkOnIssue(isMinimalIssue(issueNodeOrMinimalIssue) ? issueNodeOrMinimalIssue : issueNodeOrMinimalIssue.issue)),
        commands.registerCommand(Commands.StartWorkOnBitbucketIssue, (issue: BitbucketIssue) => Container.startWorkOnBitbucketIssueWebview.createOrShowIssue(issue)),
        commands.registerCommand(Commands.ViewDiff, async (...diffArgs: [() => {}, Uri, Uri, string]) => {
            viewScreenEvent(Registry.screen.pullRequestDiffScreen, undefined, ProductBitbucket).then(e => { Container.analyticsClient.sendScreenEvent(e); });
            diffArgs[0]();
            commands.executeCommand('vscode.diff', ...diffArgs.slice(1));
        }),
        commands.registerCommand(Commands.ShowPipeline, (pipelineInfo: any) => {
            Container.pipelineViewManager.createOrShow(pipelineInfo);
        }),
        commands.registerCommand(Commands.ShowBitbucketIssue, (issue: BitbucketIssue) => Container.bitbucketIssueViewManager.createOrShow(issue)),
        commands.registerCommand(Commands.DebugBitbucketSites, showBitbucketDebugInfo),
        commands.registerCommand(Commands.WorkbenchOpenRepository, () => {
            openWorkbenchRepositoryButtonEvent('pullRequestsTreeView').then(event => Container.analyticsClient.sendUIEvent(event));
            commands.executeCommand('workbench.action.addRootFolder');
        }),
        commands.registerCommand(Commands.WorkbenchOpenWorkspace, () => {
            openWorkbenchWorkspaceButtonEvent('pullRequestsTreeView').then(event => Container.analyticsClient.sendUIEvent(event));
            commands.executeCommand('workbench.action.openWorkspace');
        }),
        commands.registerCommand(Commands.CloneRepository, () => {
            cloneRepositoryButtonEvent('pullRequestsTreeView').then(event => Container.analyticsClient.sendUIEvent(event));
            commands.executeCommand('git.clone');
        })
    );
}
