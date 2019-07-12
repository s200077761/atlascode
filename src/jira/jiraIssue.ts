import { emptyUser, emptyIssueType, User, IssueType, IssueLinkType, EpicFieldInfo, isIssueType, isIssueLinkType } from "./jiraCommon";
import { DetailedSiteInfo, emptySiteInfo } from "../atlclients/authInfo";

export const emptyStatusCategory: StatusCategory = {
    colorName: '',
    id: -1,
    key: '',
    name: '',
    self: ''
};

export const emptyStatus: Status = {
    description: '',
    iconUrl: '',
    id: '',
    name: '',
    self: '',
    statusCategory: emptyStatusCategory
};

export const emptyPriority: Priority = {
    id: '',
    name: '',
    iconUrl: ''
};

export const emptyComment: Comment = {
    author: emptyUser,
    body: '',
    created: '',
    id: '',
    self: ''
};

export const emptyTransition: Transition = {
    hasScreen: false,
    id: '',
    isConditional: false,
    isGlobal: false,
    isInitial: false,
    name: '',
    to: emptyStatus,
};

export const emptyAttachment: Attachment = {
    author: emptyUser,
    content: '',
    created: '',
    filename: '',
    id: -1,
    mimeType: '',
    self: '',
    size: -1,
    thumbnail: '',
};

export const emptyIssue: Issue = {
    key: '',
    id: '',
    self: '',
    created: new Date(0),
    description: '',
    descriptionHtml: '',
    summary: '',
    status: emptyStatus,
    priority: emptyPriority,
    issueType: emptyIssueType,
    reporter: emptyUser,
    assignee: emptyUser,
    subtasks: [],
    issuelinks: [],
    comments: [],
    labels: [],
    attachments: [],
    transitions: [],
    components: [],
    fixVersions: [],
    siteDetails: emptySiteInfo,
    isEpic: false,
    epicChildren: [],
    epicName: '',
    epicLink: ''
};

export type issueOrKey = Issue | string;


export const issueExpand = "names,transitions,renderedFields";
export const issueTreeviewExpand = "names";

export function isIssue(a: any): a is Issue {
    return a && (<Issue>a).key !== undefined
        && (<Issue>a).summary !== undefined
        && (<Issue>a).description !== undefined;
}

export function isComment(a: any): a is Comment {
    return a && (<Comment>a).author !== undefined && (<Comment>a).body !== undefined;
}

export function isUser(a: any): a is User {
    return a && (<User>a).displayName !== undefined && (<User>a).avatarUrls !== undefined;
}

export function isStatus(a: any): a is Status {
    return a && (<Status>a).iconUrl !== undefined && (<Status>a).statusCategory !== undefined;
}

export function isPriority(a: any): a is Priority {
    return a && (<Priority>a).name !== undefined && (<Priority>a).iconUrl !== undefined;
}

export function isTransition(a: any): a is Transition {
    return a && (<Transition>a).to !== undefined && (<Transition>a).hasScreen !== undefined;
}

export function isAttachment(a: any): a is Attachment {
    return a && (<Attachment>a).mimeType !== undefined && (<Attachment>a).thumbnail !== undefined;
}

export interface Issue {
    key: string;
    id: string;
    self: string;
    created: Date;
    description: string;
    descriptionHtml: string;
    summary: string;
    status: Status;
    priority: Priority;
    issueType: IssueType;
    parentKey?: string;
    reporter: User;
    assignee: User;
    subtasks: Issue[];
    issuelinks: IssueLink[];
    comments: Comment[];
    labels: string[];
    attachments: Attachment[];
    transitions: Transition[];
    components: IdName[];
    fixVersions: IdName[];
    siteDetails: DetailedSiteInfo;
    isEpic: boolean;
    epicChildren: Issue[];
    epicName: string;
    epicLink: string;
}

export interface Status {
    description: string;
    iconUrl: string;
    id: string;
    name: string;
    self: string;
    statusCategory: StatusCategory;
}
export interface StatusCategory {
    colorName: string;
    id: number;
    key: string;
    name: string;
    self: string;
}

export interface Priority {
    id: string;
    name: string;
    iconUrl: string;
}

export interface Attachment {
    author: User;
    content: string;
    created: string;
    filename: string;
    id: number;
    mimeType: string;
    self: string;
    size: number;
    thumbnail: string;
}

export interface Comment {
    author: User;
    body: string;
    created: string;
    id: string;
    self: string;
}

export interface Transition {
    hasScreen: boolean;
    id: string;
    isConditional: boolean;
    isGlobal: boolean;
    isInitial: boolean;
    name: string;
    to: Status;
}

export interface IdName {
    id: string;
    name: string;
}

export interface IssueLink {
    id: string;
    type: IssueLinkType;
    inwardIssue?: Issue;
    outwardIssue?: Issue;
}
