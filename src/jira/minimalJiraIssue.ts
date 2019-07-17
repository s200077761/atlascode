import { IssueType, IssueLinkType, emptyIssueType, Status, Priority, Transition, emptyStatus, emptyPriority } from "./jiraCommon";
import { DetailedSiteInfo, emptySiteInfo } from "../atlclients/authInfo";

export type minimalIssueOrKey = MinimalIssue | string;

export interface MinimalIssue {
    key: string;
    id: string;
    self: string;
    created: Date;
    updated: Date;
    description: string;
    descriptionHtml: string;
    summary: string;
    status: Status;
    priority: Priority;
    issueType: IssueType;
    parentKey?: string;
    subtasks: MinimalIssue[];
    issuelinks: MinimalIssueLink[];
    transitions: Transition[];
    siteDetails: DetailedSiteInfo;
    isEpic: boolean;
    epicChildren: MinimalIssue[];
    epicName: string;
    epicLink: string;
}

export interface MinimalIssueLink {
    id: string;
    type: IssueLinkType;
    inwardIssue?: MinimalIssue;
    outwardIssue?: MinimalIssue;
}

export const emptyMinimalIssue: MinimalIssue = {
    key: '',
    id: '',
    self: '',
    created: new Date(0),
    updated: new Date(0),
    description: '',
    descriptionHtml: '',
    summary: '',
    status: emptyStatus,
    priority: emptyPriority,
    issueType: emptyIssueType,
    subtasks: [],
    issuelinks: [],
    transitions: [],
    siteDetails: emptySiteInfo,
    isEpic: false,
    epicChildren: [],
    epicName: '',
    epicLink: ''
};

export function isMinimalIssue(a: any): a is MinimalIssue {
    return a && (<MinimalIssue>a).key !== undefined
        && (<MinimalIssue>a).summary !== undefined;
}

