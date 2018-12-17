import { Message } from "./messaging";
import { Issue, Project } from "../jira/jiraModel";
import { WorkingProject } from "../config/model";

// IssueData is the message that gets sent to the JiraIssuePage react view containing the issue details.
// we simply use the same name with two extend statements to merge the multiple interfaces
export interface IssueData extends Message {}
export interface IssueData extends Issue {
    isAssignedToMe: boolean;
}

export interface CreateIssueData extends Message {
    selectedProject:WorkingProject;
    selectedIssueType:JIRA.Schema.CreateMetaIssueTypeBean;
    availableProjects:WorkingProject[];
    issueTypeScreens:{[k:string]:CreateIssueScreen};
    fieldValues:{[k:string]:any};
}

export interface CreateIssueScreen {
    name:string;
    id:string;
    iconUrl?:string;
    fields:JIRA.Schema.FieldMetaBean[];
}

export interface ProjectList extends Message {
    availableProjects:Project[];
}
