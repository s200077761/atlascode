import { Message } from "./messaging";
import { IConfig, emptyConfig } from "../config/model";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { Project } from "../jira/jiraModel";

export interface ConfigData extends Message {
    config: IConfig;
    jiraSites: DetailedSiteInfo[];
    bitbucketSites: DetailedSiteInfo[];
    projects: Project[];
    isJiraAuthenticated: boolean;
    isJiraStagingAuthenticated: boolean;
    isStagingEnabled: boolean;
    isBitbucketAuthenticated: boolean;
    jiraAccessToken: string;
    jiraStagingAccessToken: string;
}

export const emptyConfigData: ConfigData = {
    type: 'init',
    config: emptyConfig,
    jiraSites: [],
    projects: [],
    bitbucketSites: [],
    isJiraAuthenticated: false,
    isJiraStagingAuthenticated: false,
    isStagingEnabled: false,
    isBitbucketAuthenticated: false,
    jiraAccessToken: '',
    jiraStagingAccessToken: ''
};