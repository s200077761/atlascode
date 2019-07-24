import { isArray } from 'util';

export interface Version {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly archived: boolean;
    readonly released: boolean;
    readonly startDate: string;
    readonly releaseDate: string;
    readonly overdue: boolean;
    readonly userStartDate: string;
    readonly userReleaseDate: string;
    readonly project: string;
    readonly projectId: number;
    readonly moveUnfixedIssuesTo: string;
    readonly operations: SimpleLink[];
    readonly issueStatusForVersionFix: VersionIssueStatus;
}

export function readVersion(params: any): Version {
    let operations: SimpleLink[] = [];
    if (isArray(params.operations)) {
        operations = params.operations.map((o: any) => readSimpleLink(o));
    }

    return {
        id: params.id,
        name: params.name,
        description: params.description,
        archived: params.archived,
        released: params.released,
        startDate: params.startDate,
        releaseDate: params.releaseDate,
        overdue: params.overdue,
        userStartDate: params.userStartDate,
        userReleaseDate: params.userReleaseDate,
        project: params.project,
        projectId: params.projectId,
        moveUnfixedIssuesTo: params.moveUnfixedIssuesTo,
        operations: operations,
        issueStatusForVersionFix: readVersionIssueStatus(params.issueStatusForVersionFix)
    };
}

export interface VersionIssueStatus {
    readonly unmapped: number;
    readonly toDo: number;
    readonly inProgress: number;
    readonly done: number;
    readonly additionalProperties: any;
}

function readVersionIssueStatus(params: any): VersionIssueStatus {
    return {
        unmapped: params.unmapped,
        toDo: params.toDo,
        inProgress: params.inProgress,
        done: params.done,
        additionalProperties: params.additionalProperties
    };
}

export interface SimpleLink {
    readonly id: string;
    readonly styleClass: string;
    readonly iconClass: string;
    readonly label: string;
    readonly title: string;
    readonly href: string;
    readonly weight: number;
}

function readSimpleLink(params: any): SimpleLink {
    return {
        id: params.id,
        styleClass: params.styleClass,
        iconClass: params.iconClass,
        label: params.label,
        title: params.title,
        href: params.href,
        weight: params.weight
    };
}