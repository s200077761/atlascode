'use strict';

import { AccessibleResource } from "../atlclients/authInfo";

export enum OutputLevel {
    Silent = 'silent',
    Errors = 'errors',
    Info = 'info',
    Debug = 'debug'
}

export interface WorkingProject {
    name: string;
    id: string;
    key: string;
}

export interface IConfig {
    outputLevel: OutputLevel;
    enableCharles: boolean;
    offlineMode: boolean;
    showWelcomeOnInstall: boolean;
    jira: JiraConfig;
    bitbucket: BitbucketConfig;

}

export interface JiraConfig {
    workingProject: WorkingProject;
    workingSite: AccessibleResource;
    explorer: JiraExplorer;
    issueMonitor: JiraIssueMonitor;
    statusbar: JiraStatusBar;
    hover: JiraHover;
    customJql: SiteJQL[];
}

export interface JiraStatusBar {
    enabled: boolean;
    showProduct: boolean;
    showUser: boolean;
    showSite: boolean;
    showProject: boolean;
    showLogin: boolean;
}

export interface JiraIssueMonitor {
    refreshInterval: number;
}

export interface JiraExplorer {
    enabled: boolean;
    showOpenIssues: boolean;
    showAssignedIssues: boolean;
    refreshInterval: number;
}

export interface JiraHover {
    enabled: boolean;
}

export interface SiteJQL {
    siteId: string;
    jql: JQLEntry[];
}

export interface JQLEntry {
    id: string;
    enabled: boolean;
    name: string;
    query: string;
}

export interface BitbucketConfig {
    explorer: BitbucketExplorer;
    statusbar: BitbucketStatusBar;
    contextMenus: BitbucketContextMenus;
    pipelines: BitbucketPipelinesConfig;
    issues: BitbucketIssuesConfig;
}

export interface BitbucketPipelinesConfig {
    explorerEnabled: boolean;
    monitorEnabled: boolean;
    refreshInterval: number;
}

export interface BitbucketIssuesConfig {
    explorerEnabled: boolean;
    monitorEnabled: boolean;
    refreshInterval: number;
}

export interface BitbucketExplorer {
    enabled: boolean;
    refreshInterval: number;
    relatedJiraIssues: BitbucketRelatedJiraIssues;
    relatedBitbucketIssues: BitbucketRelatedBitbucketIssues;
    notifications: BitbucketNotifications;
}

export interface BitbucketRelatedJiraIssues {
    enabled: boolean;
}

export interface BitbucketRelatedBitbucketIssues {
    enabled: boolean;
}

export interface BitbucketNotifications {
    refreshInterval: number;
    pullRequestCreated: boolean;
}

export interface BitbucketStatusBar {
    enabled: boolean;
    showProduct: boolean;
    showUser: boolean;
    showLogin: boolean;
}

export interface BitbucketContextMenus {
    enabled: boolean;
}

export const emptyWorkingSite: AccessibleResource = {
    name: '',
    id: '',
    scopes: [],
    avatarUrl: '',
    baseUrlSuffix: 'atlassian.net'
};

export function isEmptySite(s: AccessibleResource): boolean {
    return ((s.name === undefined || s.name === '')
        && (s.id === undefined || s.id === '')
        && (s.avatarUrl === undefined || s.avatarUrl === '')
        && (s.scopes === undefined || s.scopes === []))
        ;
}

export const emptyWorkingProject: WorkingProject = {
    name: '',
    id: '',
    key: ''
};

export function notEmptyProject(p: WorkingProject): p is WorkingProject {
    return (<WorkingProject>p).name !== undefined
        && (<WorkingProject>p).name !== ''
        && (<WorkingProject>p).id !== undefined
        && (<WorkingProject>p).id !== ''
        && (<WorkingProject>p).key !== undefined
        && (<WorkingProject>p).key !== ''
        ;
}

export function isStagingSite(s: AccessibleResource): boolean {
    return s.baseUrlSuffix === 'jira-dev.com';
}

export const emptyJiraExplorer: JiraExplorer = {
    enabled: true,
    showOpenIssues: true,
    showAssignedIssues: true,
    refreshInterval: 5
};

export const emtpyIssueMonitor: JiraIssueMonitor = {
    refreshInterval: 5
};

export const emptyJiraStatusBar: JiraStatusBar = {
    enabled: true,
    showProduct: true,
    showUser: true,
    showSite: false,
    showProject: false,
    showLogin: true
};

export const emptyJiraHover: JiraHover = {
    enabled: true
};

export const emptyJQLEntry: JQLEntry = {
    id: "",
    enabled: true,
    name: "",
    query: ""
};

export const emptyJiraConfig: JiraConfig = {
    workingProject: emptyWorkingProject,
    workingSite: emptyWorkingSite,
    explorer: emptyJiraExplorer,
    issueMonitor: emtpyIssueMonitor,
    statusbar: emptyJiraStatusBar,
    hover: emptyJiraHover,
    customJql: []
};

export const emptyRelatedJiraIssues: BitbucketRelatedJiraIssues = {
    enabled: true
};

export const emptyRelatedBitbucketIssues: BitbucketRelatedBitbucketIssues = {
    enabled: true
};

export const emptyBitbucketNotfications: BitbucketNotifications = {
    refreshInterval: 10,
    pullRequestCreated: true
};

export const emptyBitbucketExplorer: BitbucketExplorer = {
    enabled: true,
    refreshInterval: 5,
    relatedJiraIssues: emptyRelatedJiraIssues,
    relatedBitbucketIssues: emptyRelatedBitbucketIssues,
    notifications: emptyBitbucketNotfications
};

export const emptyBitbucketStatusBar: BitbucketStatusBar = {
    enabled: true,
    showProduct: true,
    showUser: true,
    showLogin: true
};

export const emptyBitbucketContextMenus: BitbucketContextMenus = {
    enabled: true
};

export const emptyPipelinesConfig: BitbucketPipelinesConfig = {
    explorerEnabled: true,
    monitorEnabled: true,
    refreshInterval: 5
};

export const emptyIssuesConfig: BitbucketIssuesConfig = {
    explorerEnabled: true,
    monitorEnabled: true,
    refreshInterval: 15
};

export const emptyBitbucketConfig: BitbucketConfig = {
    explorer: emptyBitbucketExplorer,
    statusbar: emptyBitbucketStatusBar,
    contextMenus: emptyBitbucketContextMenus,
    pipelines: emptyPipelinesConfig,
    issues: emptyIssuesConfig
};

export const emptyConfig: IConfig = {
    outputLevel: OutputLevel.Silent,
    enableCharles: false,
    offlineMode: false,
    showWelcomeOnInstall: true,
    jira: emptyJiraConfig,
    bitbucket: emptyBitbucketConfig
};
