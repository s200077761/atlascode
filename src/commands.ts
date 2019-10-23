import * as vscode from 'vscode';
import { Container } from './container';
import { assignIssue } from './commands/jira/assignIssue';
import { IssueNode } from './views/nodes/issueNode';
import { AbstractBaseNode } from './views/nodes/abstractBaseNode';
import { viewScreenEvent, Registry } from './analytics';
import { showIssue, showIssueForKey, showIssueForSiteIdAndKey } from './commands/jira/showIssue';
import { createIssue } from './commands/jira/createIssue';
import { BitbucketIssue } from './bitbucket/model';
import { MinimalIssue, isMinimalIssue, MinimalIssueOrKeyAndSite } from './jira/jira-client/model/entities';
import { startWorkOnIssue } from './commands/jira/startWorkOnIssue';
import { SettingSource } from './config/model';
import { ProductBitbucket } from './atlclients/authInfo';
import { showBitbucketDebugInfo } from './bitbucket/bbDebug';

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
    BitbucketDeleteComment = 'atlascode.bb.deleteComment',
    BitbucketEditComment = 'atlascode.bb.editComment',
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
    BBPRCancelCommentEdit = 'atlascode.bb.cancelCommentEdit',
    BBPRSubmitCommentEdit = 'atlascode.bb.saveCommentEdit',
    ViewDiff = 'atlascode.viewDiff',
    DebugBitbucketSites = 'atlascode.debug.bitbucketSites'
}

export function registerCommands(vscodeContext: vscode.ExtensionContext) {
    vscodeContext.subscriptions.push(
        vscode.commands.registerCommand(Commands.ShowConfigPage, () => Container.configWebview.createOrShowConfig(SettingSource.Default), Container.configWebview),
        vscode.commands.registerCommand(Commands.ShowJiraAuth, () => Container.configWebview.createOrShowConfig(SettingSource.JiraAuth), Container.configWebview),
        vscode.commands.registerCommand(Commands.ShowBitbucketAuth, () => Container.configWebview.createOrShowConfig(SettingSource.BBAuth), Container.configWebview),
        vscode.commands.registerCommand(Commands.ShowJiraIssueSettings, () => Container.configWebview.createOrShowConfig(SettingSource.JiraIssue), Container.configWebview),
        vscode.commands.registerCommand(Commands.ShowPullRequestSettings, () => Container.configWebview.createOrShowConfig(SettingSource.BBPullRequest), Container.configWebview),
        vscode.commands.registerCommand(Commands.ShowPipelineSettings, () => Container.configWebview.createOrShowConfig(SettingSource.BBPipeline), Container.configWebview),
        vscode.commands.registerCommand(Commands.ShowBitbucketIssueSettings, () => Container.configWebview.createOrShowConfig(SettingSource.BBIssue), Container.configWebview),
        vscode.commands.registerCommand(Commands.ShowWelcomePage, Container.welcomeWebview.createOrShow, Container.welcomeWebview),
        vscode.commands.registerCommand(Commands.ShowOnboardingPage, Container.onboardingWebview.createOrShow, Container.onboardingWebview),
        vscode.commands.registerCommand(Commands.ViewInWebBrowser, async (prNode: AbstractBaseNode) => {
            const uri = (await prNode.getTreeItem()).resourceUri;
            if (uri) {
                vscode.env.openExternal(uri);
            }
        }),
        vscode.commands.registerCommand(Commands.CreateIssue, (data: any) => createIssue(data)),
        vscode.commands.registerCommand(Commands.ShowIssue, async (issueOrKeyAndSite: MinimalIssueOrKeyAndSite) => await showIssue(issueOrKeyAndSite)),
        vscode.commands.registerCommand(Commands.ShowIssueForKey, async (issueKey?: string) => await showIssueForKey(issueKey)),
        vscode.commands.registerCommand(Commands.ShowIssueForSiteIdAndKey, async (siteId: string, issueKey: string) => await showIssueForSiteIdAndKey(siteId, issueKey)),
        vscode.commands.registerCommand(Commands.AssignIssueToMe, (issueNode: IssueNode) => assignIssue(issueNode)),
        vscode.commands.registerCommand(Commands.StartWorkOnIssue, (issueNodeOrMinimalIssue: IssueNode | MinimalIssue) => startWorkOnIssue(isMinimalIssue(issueNodeOrMinimalIssue) ? issueNodeOrMinimalIssue : issueNodeOrMinimalIssue.issue)),
        vscode.commands.registerCommand(Commands.StartWorkOnBitbucketIssue, (issue: BitbucketIssue) => Container.startWorkOnBitbucketIssueWebview.createOrShowIssue(issue)),
        vscode.commands.registerCommand(Commands.ViewDiff, async (...diffArgs: [() => {}, vscode.Uri, vscode.Uri, string]) => {
            viewScreenEvent(Registry.screen.pullRequestDiffScreen, undefined, ProductBitbucket).then(e => { Container.analyticsClient.sendScreenEvent(e); });
            diffArgs[0]();
            vscode.commands.executeCommand('vscode.diff', ...diffArgs.slice(1));
        }),
        vscode.commands.registerCommand(Commands.ShowPipeline, (pipelineInfo: any) => {
            Container.pipelineViewManager.createOrShow(pipelineInfo);
        }),
        vscode.commands.registerCommand(Commands.ShowBitbucketIssue, (issue: BitbucketIssue) => Container.bitbucketIssueViewManager.createOrShow(issue)),
        vscode.commands.registerCommand(Commands.DebugBitbucketSites, showBitbucketDebugInfo),
    );
}
