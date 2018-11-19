import { commands } from "vscode";

export const extensionId = 'atlascode';
export const extensionOutputChannelName = 'Atlascode';
export const JiraWorkingSiteConfigurationKey = 'jira.workingSite';
export const JiraWorkingProjectConfigurationKey = "jira.workingProject";
export const BitbucketContainerConfigurationKey = 'bitbucket.explorerLocation';
export const OpenIssuesTreeId = 'openIssues';
export const AssignedIssuesTreeId = 'assignedIssues';

export enum CommandContext {
    JiraExplorer = 'atlascode:jiraExplorerEnabled',
    OpenIssuesTree = 'atlascode:openIssueTreeEnabled',
    AssignedIssuesTree = 'atlascode:assignedIssuesTreeEnabled',
}

export function setCommandContext(key: CommandContext | string, value: any) {
    return commands.executeCommand('setContext', key, value);
}
