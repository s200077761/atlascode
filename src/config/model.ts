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

export interface BitbucketConfig {
    explorer: BitbucketExplorer;
    statusbar:BitbucketStatusBar;
}

export interface BitbucketExplorer {
    enabled:boolean;
    location:BitbucketExplorerLocation;
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

export const emptyJiraConfig:JiraConfig = {
    workingProject: emptyWorkingProject,
    workingSite: emptyWorkingSite,
    explorer: emptyJiraExplorer,
    statusbar: emptyJiraStatusBar
};

export const emptyBitbucketExplorer: BitbucketExplorer = {
    enabled:true,
    location:BitbucketExplorerLocation.Atlascode
};

export const emptyBitbucketStatusBar: BitbucketStatusBar = {
    enabled:true,
    showProduct:true,
    showUser:true,
    showLogin:true
};

export const emptyBitbucketConfig:BitbucketConfig = {
    explorer: emptyBitbucketExplorer,
    statusbar:emptyBitbucketStatusBar
};

export const emptyConfig:IConfig = {
    outputLevel: OutputLevel.Silent,
    enableCharles:false,
    showWelcomeOnInstall:true,
    jira: emptyJiraConfig,
    bitbucket: emptyBitbucketConfig
};