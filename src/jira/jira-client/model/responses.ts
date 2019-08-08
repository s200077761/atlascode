import { MinimalIssue, isProject, readProject, Project } from "./entities";
import { DetailedSiteInfo } from "../../../atlclients/authInfo";
import { minimalIssueFromJsonObject } from "../issueFromJson";
import { EpicFieldInfo } from "../../jiraCommon";

export interface CreatedIssue {
    readonly id: string;
    readonly key: string;
}

export function readCreatedIssue(params: any): CreatedIssue {
    return {
        id: params.id,
        key: params.key,
    };
}

export interface ErrorWithMessages {
    readonly errorMessages: string[];
}

export interface ErrorCollection extends ErrorWithMessages {
    readonly errors: { [key: string]: string };
}

export function isErrorCollection(a: any): a is ErrorCollection {
    return a && (<ErrorCollection>a).errorMessages !== undefined
        && (<ErrorCollection>a).errors !== undefined;
}

export function isErrorWithMessages(a: any): a is ErrorCollection {
    return a && (<ErrorCollection>a).errorMessages !== undefined;
}

export function readErrorCollection(params: any): ErrorCollection {
    return {
        errorMessages: Array.isArray(params.errorMessages) ? params.errorMessages : [],
        errors: params.errors
    };
}

export class IssuePickerResult {
    public readonly sections: Section[];
}

export class Section {
    public readonly issues: IssuePickerIssue[];
}

export class IssuePickerIssue {
    img: string;
    key: string;
    keyHtml: string;
    summary: string;
    summaryText: string;
}

export interface SearchResults {
    readonly issues: MinimalIssue[];
    readonly maxResults: number;
    readonly startAt: number;
    readonly total: number;
}

export async function readSearchResults(params: any, site: DetailedSiteInfo, epicFieldInfo: EpicFieldInfo): Promise<SearchResults> {

    return {
        maxResults: params.maxResults,
        startAt: params.startAt,
        total: params.total,
        issues: Array.isArray(params.issues) ? params.issues.map((i: any) => minimalIssueFromJsonObject(i, site, epicFieldInfo)) : []
    };
}

export function readProjects(projects: any[] | undefined): Project[] {

    if (projects) {
        return projects
            .filter(project => isProject(project))
            .map(project => readProject(project));
    }

    return [];
}
