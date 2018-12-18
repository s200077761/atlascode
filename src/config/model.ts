'use strict';

export enum OutputLevel {
    Silent = 'silent',
    Errors = 'errors',
    Info = 'info',
    Debug = 'debug'
}

export interface WorkingSite {
    name:string;
    id:string;
    scopes: Array<string>;
    avatarUrl: string;
}

export interface WorkingProject {
    name:string;
    id:string;
    key:string;
}

export interface IConfig {
    outputLevel: OutputLevel;
    enableCharles:boolean;
    showWelcomeOnInstall:boolean;
    jira: JiraConfig;
    bitbucket: BitbucketConfig;
    
}

export interface JiraConfig {
    workingProject: WorkingProject;
    workingSite: WorkingSite;
    explorer:JiraExplorer;
    statusbar:JiraStatusBar;
    hover: JiraHover;
    customJql: SiteJQL[];
}

export interface JiraStatusBar {
    enabled:boolean;
    showProduct:boolean;
    showUser:boolean;
    showSite:boolean;
    showProject:boolean;
    showLogin:boolean;
}

export interface JiraExplorer {
    enabled:boolean;
    showOpenIssues:boolean;
    showAssignedIssues:boolean;
}

export interface JiraHover {
    enabled:boolean;
}

export interface SiteJQL {
    siteId: string;
    jql: string[];
}

export interface BitbucketConfig {
    explorer: BitbucketExplorer;
    statusbar:BitbucketStatusBar;
    contextMenus:BitbucketContextMenus;
}

export interface BitbucketExplorer {
    enabled:boolean;
    refreshInterval:number;
    location:BitbucketExplorerLocation;
    relatedJiraIssues:BitbucketRelatedJiraIssues;
    notifications:BitbucketNotifications;
}

export interface BitbucketRelatedJiraIssues {
    enabled:boolean;
}

export interface BitbucketNotifications {
    refreshInterval:number;
    pullRequestCreated:boolean;
}

export interface BitbucketStatusBar {
    enabled:boolean;
    showProduct:boolean;
    showUser:boolean;
    showLogin:boolean;
}

export enum BitbucketExplorerLocation {
    SourceControl = "SourceControl",
    Atlascode = "Atlascode"
}

export interface BitbucketContextMenus {
    enabled:boolean;
}

export const emptyWorkingSite: WorkingSite = {
    name: '',
    id: '',
    scopes: [],
    avatarUrl: ''
};

export const emptyWorkingProject: WorkingProject = {
    name: '',
    id: '',
    key: ''
};

export const emptyJiraExplorer: JiraExplorer = {
    enabled:true,
    showOpenIssues:true,
    showAssignedIssues:true
};

export const emptyJiraStatusBar: JiraStatusBar = {
    enabled:true,
    showProduct:true,
    showUser:true,
    showSite:false,
    showProject:false,
    showLogin:true
};

export const emptyJiraHover: JiraHover = {
    enabled: true
};

export const emptyJiraConfig:JiraConfig = {
    workingProject: emptyWorkingProject,
    workingSite: emptyWorkingSite,
    explorer: emptyJiraExplorer,
    statusbar: emptyJiraStatusBar,
    hover: emptyJiraHover,
    customJql: []
};

export const emptyRelatedJiraIssues: BitbucketRelatedJiraIssues = {
    enabled: true
};

export const emptyBitbucketNotfications: BitbucketNotifications = {
    refreshInterval: 10,
    pullRequestCreated: true
};

export const emptyBitbucketExplorer: BitbucketExplorer = {
    enabled:true,
    refreshInterval:5,
    location:BitbucketExplorerLocation.Atlascode,
    relatedJiraIssues: emptyRelatedJiraIssues,
    notifications: emptyBitbucketNotfications
};

export const emptyBitbucketStatusBar: BitbucketStatusBar = {
    enabled:true,
    showProduct:true,
    showUser:true,
    showLogin:true
};

export const emptyBitbucketContextMenus: BitbucketContextMenus = {
    enabled:true
};

export const emptyBitbucketConfig:BitbucketConfig = {
    explorer: emptyBitbucketExplorer,
    statusbar:emptyBitbucketStatusBar,
    contextMenus:emptyBitbucketContextMenus
};

export const emptyConfig:IConfig = {
    outputLevel: OutputLevel.Silent,
    enableCharles:false,
    showWelcomeOnInstall:true,
    jira: emptyJiraConfig,
    bitbucket: emptyBitbucketConfig
};