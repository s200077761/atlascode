import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { flatten } from 'flatten-anything';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { emptyConfig } from '../../../config/model';
import { ConfigTarget, FlattenedConfig } from '../models/config';

export enum OnboardingMessageType {
    Init = 'init',
    Update = 'configUpdate',
    SitesUpdate = 'sitesAvailableUpdate'
}

export type OnboardingMessage =
    | ReducerAction<OnboardingMessageType.Init, OnboardingInitMessage>
    | ReducerAction<OnboardingMessageType.Update, OnboardingInitMessage>
    | ReducerAction<OnboardingMessageType.SitesUpdate, SitesUpdateMessage>;

export type OnboardingResponse = any;

export interface OnboardingInitMessage {
    config: FlattenedConfig;
    jiraSites: DetailedSiteInfo[];
    bitbucketSites: DetailedSiteInfo[];
    isRemote: boolean;
    target: ConfigTarget;
}

export const emptyOnboardingInitMessage: OnboardingInitMessage = {
    config: flatten(emptyConfig),
    jiraSites: [],
    bitbucketSites: [],
    isRemote: false,
    target: ConfigTarget.User
};

export interface ConfigUpdateMessage {
    config: FlattenedConfig;
    target: ConfigTarget;
}

export interface SitesUpdateMessage {
    jiraSites: DetailedSiteInfo[];
    bitbucketSites: DetailedSiteInfo[];
}
