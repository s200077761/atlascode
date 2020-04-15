import { Message } from './messaging';
import { IConfig } from '../config/model';
import { AuthInfo, DetailedSiteInfo, emptySiteInfo } from '../atlclients/authInfo';

export interface FeedbackUser {
    userName: string;
    emailAddress: string;
}

export interface ConfigWorkspaceFolder {
    name: string;
    uri: string;
}

export interface SiteAuthInfo {
    site: DetailedSiteInfo;
    auth: AuthInfo | undefined;
}

export const emptySiteAuthInfo: SiteAuthInfo = {
    site: emptySiteInfo,
    auth: undefined,
};

export type ConfigInspect = { [key: string]: any };
export interface ConfigData extends Message {
    inspect: ConfigInspect;
    jiraSites: SiteAuthInfo[];
    bitbucketSites: SiteAuthInfo[];
    workspaceFolders: ConfigWorkspaceFolder[];
    feedbackUser: FeedbackUser;
    isRemote: boolean;
    showTunnelOption: boolean;
}

export const emptyConfigData: ConfigData = {
    type: 'init',
    inspect: {},
    jiraSites: [],
    bitbucketSites: [],
    workspaceFolders: [],
    feedbackUser: {
        userName: '',
        emailAddress: '',
    },
    isRemote: false,
    showTunnelOption: false,
};

export interface ConfigUpdate extends Message {
    config: IConfig;
}

export interface JqlData extends Message {
    data: any;
}

export interface SitesAvailableUpdate extends Message {
    jiraSites: SiteAuthInfo[];
    bitbucketSites: SiteAuthInfo[];
}
