import { Message } from "./messaging";
import { IConfig, emptyConfig } from "../config/model";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { Project } from "../jira/jira-client/model/entities";
import { JiraSiteProjectMapping } from "../jira/projectManager";

export interface FeedbackUser {
    userName: string;
    emailAddress: string;
}

export interface ConfigData extends Message {
    config: IConfig;
    jiraSites: DetailedSiteInfo[];
    bitbucketSites: DetailedSiteInfo[];
    projects: Project[];
    feedbackUser: FeedbackUser;
    siteProjectMapping: JiraSiteProjectMapping;
}

export const emptyConfigData: ConfigData = {
    type: 'init',
    config: emptyConfig,
    jiraSites: [],
    projects: [],
    bitbucketSites: [],
    feedbackUser: {
        userName: '',
        emailAddress: ''
    },
    siteProjectMapping: {}
};

export interface ConfigUpdate extends Message {
    config: IConfig;
}

export interface SitesAvailableUpdate extends Message {
    jiraSites: DetailedSiteInfo[];
    bitbucketSites: DetailedSiteInfo[];
}
