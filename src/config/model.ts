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
    workingProject:string;
    workingSite: WorkingSite;
}