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
}

export interface BitbucketConfig {
    explorerLocation: BitbucketExplorerLocation;
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
    enabled:true
};

export const emptyJiraConfig:JiraConfig = {
    workingProject: undefined,
    workingSite: emptyWorkingSite,
    explorer: emptyJiraExplorer
};

export const emptyBitbucketConfig:BitbucketConfig = {
    explorerLocation: BitbucketExplorerLocation.Atlascode
};

export const emptyConfig:IConfig = {
    outputLevel: OutputLevel.Silent,
    enableCharles:false,
    jira: emptyJiraConfig,
    bitbucket: emptyBitbucketConfig
};