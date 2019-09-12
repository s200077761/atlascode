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
    isJiraAuthenticated: boolean;
    isJiraStagingAuthenticated: boolean;
    isStagingEnabled: boolean;
    isBitbucketAuthenticated: boolean;
    jiraAccessToken: string;
    jiraStagingAccessToken: string;
    feedbackUser: FeedbackUser;
    siteProjectMapping: JiraSiteProjectMapping;
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
    jiraStagingAccessToken: '',
    feedbackUser: {
        userName: '',
        emailAddress: ''
    },
    siteProjectMapping: {}
};