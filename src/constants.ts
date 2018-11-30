import { commands } from "vscode";

export const extensionId = 'atlascode';
export const extensionOutputChannelName = 'Atlascode';
export const JiraWorkingSiteConfigurationKey = 'jira.workingSite';
export const JiraWorkingProjectConfigurationKey = "jira.workingProject";
export const JiraHoverProviderConfigurationKey = 'jira.hover.enabled';
export const OpenIssuesTreeId = 'atlascode.views.jira.openIssues';
export const AssignedIssuesTreeId = 'atlascode.views.jira.assignedIssues';
export const PullRequestTreeViewId = 'atlascode.views.bb.pullrequestsTreeView';
export const GlobalStateVersionKey = 'atlascodeVersion';

export enum CommandContext {
    JiraExplorer = 'atlascode:jiraExplorerEnabled',
    BitbucketExplorer = 'atlascode:bitbucketExplorerEnabled',
    OpenIssuesTree = 'atlascode:openIssuesTreeEnabled',
    AssignedIssuesTree = 'atlascode:assignedIssuesTreeEnabled',
    JiraLoginTree = 'atlascode:jiraLoginTreeEnabled',
    IsJiraAuthenticated = 'atlascode:isJiraAuthenticated',
    IsBBAuthenticated = 'atlascode:isBBAuthenticated',
    BitbucketExplorerLocation = 'atlascode:bitbucketExplorerLocation'
}

export function setCommandContext(key: CommandContext | string, value: any) {
    return commands.executeCommand('setContext', key, value);
}
