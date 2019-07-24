import { User } from "../jiraCommon";

export interface Component {
    id: string;
    name: string;
    description: string;
    lead: User;
    leadUserName: string | undefined;
    leadAccountId: string | undefined;
    assigneeType: string;
    assignee: User;
    realAssigneeType: string;
    realAssignee: User;
    isAssigneeTypeValid: boolean;
    project: string;
    projectId: number;
}

export function readComponent(value: any): Component {
    return {
        id: value.id,
        name: value.name,
        description: value.description,
        lead: value.lead,
        leadUserName: value.leadUserName,
        leadAccountId: value.leadAccountId,
        assigneeType: value.assigneeType,
        assignee: value.assignee,
        realAssigneeType: value.realAssigneeType,
        realAssignee: value.realAssignee,
        isAssigneeTypeValid: value.isAssigneeTypeValid,
        project: value.project,
        projectId: value.projectId
    };
}
