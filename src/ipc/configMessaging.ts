import { Message } from "./messaging";
import { IConfig, emptyConfig } from "../config/model";
import { AuthInfo, emptyAuthInfo } from "../atlclients/authInfo";
import { Project } from "../jira/jiraModel";

export interface ConfigData extends Message {
    config:IConfig;
    authInfo:AuthInfo;
    projects:Project[];
}

export const emptyConfigData:ConfigData = {
    type:'init',
    config:emptyConfig,
    authInfo:emptyAuthInfo,
    projects:[]
}