'use strict';

export enum OutputLevel {
    Silent = 'silent',
    Errors = 'errors',
    Info = 'info',
    Debug = 'debug'
}

export interface IConfig {
    outputLevel: OutputLevel;
}