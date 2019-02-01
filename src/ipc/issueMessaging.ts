import { Message } from "./messaging";
import { Issue, Project } from "../jira/jiraModel";
import { WorkingProject } from "../config/model";
import { IssueTypeIdScreens } from "../jira/createIssueMeta";


// IssueData is the message that gets sent to the JiraIssuePage react view containing the issue details.
// we simply use the same name with two extend statements to merge the multiple interfaces
export interface IssueData extends Message {}
export interface IssueData extends Issue {
    isAssignedToMe: boolean;
}

export interface CreateIssueData extends Message {
    selectedProject:WorkingProject;
    selectedIssueTypeId:string | undefined;
    availableProjects:WorkingProject[];
    issueTypeScreens:IssueTypeIdScreens;
}

export interface ProjectList extends Message {
    availableProjects:Project[];
}

export interface LabelList extends Message {
    labels:any[];
}

export interface UserList extends Message {
    users:any[];
}

export interface CreatedSomething extends Message {
    createdData:any;
}

export interface IssueCreated extends Message {
    issueData:any;
}

export function isCreatedSomething(m: Message): m is  CreatedSomething {
    return (<CreatedSomething>m).createdData !== undefined;
}

export function isIssueCreated(m: Message): m is  IssueCreated {
    return (<IssueCreated>m).issueData !== undefined;
}
