import { Message } from "./messaging";
import { Issue, Project, EpicFieldInfo } from "../jira/jiraModel";
import { WorkingProject } from "../config/model";
import { IssueTypeIdScreens, TransformerProblems } from "../jira/createIssueMeta";
import { RepoData } from "./prMessaging";
import { PullRequestData } from "../bitbucket/model";


// IssueData is the message that gets sent to the JiraIssuePage react view containing the issue details.
// we simply use the same name with two extend statements to merge the multiple interfaces
export interface IssueData extends Message { }
export interface IssueData extends Issue {
    currentUserId: string;
    childIssues: Issue[];
    workInProgress: boolean;
    recentPullRequests: PullRequestData[];
}

export interface IssueProblemsData extends Message {
    problems: TransformerProblems;
    project: WorkingProject;
}

export interface CreateIssueData extends Message {
    selectedProject: WorkingProject;
    selectedIssueTypeId: string | undefined;
    availableProjects: WorkingProject[];
    issueTypeScreens: IssueTypeIdScreens;
    epicFieldInfo: EpicFieldInfo;
    transformerProblems: TransformerProblems;
}

export interface PreliminaryIssueData extends Message {
    summary?: string;
    description?: string;
}

export interface ProjectList extends Message {
    availableProjects: Project[];
}

export interface LabelList extends Message {
    labels: any[];
}

export interface UserList extends Message {
    users: any[];
}

export interface IssueSuggestionsList extends Message {
    issues: any[];
}

export interface JqlOptionsList extends Message {
    options: any[];
    fieldId: string;
}

export interface CreatedSomething extends Message {
    createdData: any;
}

export interface IssueCreated extends Message {
    issueData: any;
}

export interface StartWorkOnIssueData extends Message {
    issue: Issue;
    repoData: RepoData[];
}

export interface StartWorkOnIssueResult extends Message {
    type: 'startWorkOnIssueResult';
    successMessage?: string;
    error?: string;
}

export function isCreatedSomething(m: Message): m is CreatedSomething {
    return (<CreatedSomething>m).createdData !== undefined;
}

export function isIssueCreated(m: Message): m is IssueCreated {
    return (<IssueCreated>m).issueData !== undefined;
}

export function isStartWorkOnIssueData(m: Message): m is StartWorkOnIssueData {
    return (<StartWorkOnIssueData>m).issue !== undefined;
}

export function isStartWorkOnIssueResult(m: Message): m is StartWorkOnIssueResult {
    return (<StartWorkOnIssueResult>m).type === 'startWorkOnIssueResult';
}
