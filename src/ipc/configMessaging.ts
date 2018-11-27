import { Message } from "./messaging";
import { IConfig, emptyConfig } from "../config/model";
import { AccessibleResource } from "../atlclients/authInfo";
import { Project } from "../jira/jiraModel";

export interface ConfigData extends Message {
    config:IConfig;
    sites:AccessibleResource[];
    projects:Project[];
    isJiraAuthenticated:boolean;
    isBitbucketAuthenticated:boolean;
}

export const emptyConfigData:ConfigData = {
    type:'init',
    config:emptyConfig,
    sites:[],
    projects:[],
    isJiraAuthenticated: false,
    isBitbucketAuthenticated: false
};