import { isArray } from 'util';
import { FieldMeta } from './field';

//CreateMetaBean
export interface IssueCreateMetadata {
    readonly projects: ProjectIssueCreateMetadata[];
}

export function readIssueCreateMetadata(params: any): IssueCreateMetadata {
    // accessed via res.projects![0] so, might should do some validation
    return {
        projects: isArray(params.projects) ? params.projects.map((p: any) => readProjectIssueCreateMetadata(p)) : []
    };
}

// CreateMetaProjectBean
export interface ProjectIssueCreateMetadata {
    readonly id: string;
    readonly key: string;
    readonly name: string;
    readonly avatarUrls: { [k: string]: string };
    readonly issueTypes: IssueTypeIssueCreateMetadata[];
}

function readProjectIssueCreateMetadata(params: any): ProjectIssueCreateMetadata {
    return {
        id: params.id,
        key: params.key,
        name: params.name,
        avatarUrls: params.avatarUrls ? params.avatarUrls : {},
        issueTypes: params.issueTypes ? params.issueTypes.map((t: any) => readIssueTypeIssueCreateMetadata(t)) : []
    };
}

// CreateMetaIssueTypeBean
export interface IssueTypeIssueCreateMetadata {
    readonly self: string;
    readonly id: string;
    readonly description: string;
    readonly name: string;
    readonly iconUrl: string;
    readonly subtask: boolean;
    readonly avatarId: number;
    readonly entityId: string | undefined;
    readonly fields: { [k: string]: FieldMeta };
}

export function readIssueTypeIssueCreateMetadata(params: any): IssueTypeIssueCreateMetadata {
    return {
        self: params.self,
        id: params.id,
        description: params.description,
        name: params.name,
        iconUrl: params.iconUrl,
        subtask: params.subtask,
        avatarId: params.avatarId,
        entityId: params.entityId,
        fields: params.fields ? params.fields : {}
    };
}

export const emptyIssueTypeIssueCreateMetadata: IssueTypeIssueCreateMetadata = {
    self: "",
    id: "",
    description: "",
    name: "",
    iconUrl: "",
    subtask: false,
    avatarId: 0,
    entityId: "",
    fields: {}
};
