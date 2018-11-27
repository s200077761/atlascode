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
export interface IConfig {
    outputLevel: OutputLevel;
    enableCharles:boolean;
    jira: JiraConfig;
    bitbucket: BitbucketConfig;
    
}

export interface JiraConfig {
    workingProject:string | undefined;
    workingSite: WorkingSite;
    explorer:JiraExplorer;
}

export interface JiraExplorer {
    enabled:boolean;
    showOpenIssues:boolean;
    showAssignedIssues:boolean;
}

export interface BitbucketConfig {
    explorer: BitbucketExplorer;
}

export interface BitbucketExplorer {
    enabled:boolean;
    location:BitbucketExplorerLocation;
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

export const emptyJiraExplorer: JiraExplorer = {
    enabled:true,
    showOpenIssues:true,
    showAssignedIssues:true
};

export const emptyJiraConfig:JiraConfig = {
    workingProject: undefined,
    workingSite: emptyWorkingSite,
    explorer: emptyJiraExplorer
};

export const emptyBitbucketExplorer: BitbucketExplorer = {
    enabled:true,
    location:BitbucketExplorerLocation.Atlascode
};

export const emptyBitbucketConfig:BitbucketConfig = {
    explorer: emptyBitbucketExplorer
};

export const emptyConfig:IConfig = {
    outputLevel: OutputLevel.Silent,
    enableCharles:false,
    jira: emptyJiraConfig,
    bitbucket: emptyBitbucketConfig
};