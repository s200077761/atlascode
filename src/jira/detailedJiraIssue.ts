import { emptyUser, emptyIssueType, User, IssueType, emptyStatus, emptyPriority, Status, Priority, Transition } from "./jiraCommon";
import { DetailedSiteInfo, emptySiteInfo } from "../atlclients/authInfo";
import { MinimalIssue, MinimalIssueLink } from "./minimalJiraIssue";

export const emptyComment: Comment = {
    author: emptyUser,
    body: '',
    created: '',
    id: '',
    self: ''
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

export const emptyIssue: DetailedIssue = {
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


export function isDetailedIssue(a: any): a is DetailedIssue {
    return a && (<DetailedIssue>a).key !== undefined
        && (<DetailedIssue>a).summary !== undefined
        && (<DetailedIssue>a).reporter !== undefined;
}

export function isComment(a: any): a is Comment {
    return a && (<Comment>a).author !== undefined && (<Comment>a).body !== undefined;
}

export function isUser(a: any): a is User {
    return a && (<User>a).displayName !== undefined && (<User>a).avatarUrls !== undefined;
}

export function isAttachment(a: any): a is Attachment {
    return a && (<Attachment>a).mimeType !== undefined && (<Attachment>a).thumbnail !== undefined;
}


export interface DetailedIssue {
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
    reporter: User;
    assignee: User;
    subtasks: MinimalIssue[];
    issuelinks: MinimalIssueLink[];
    comments: Comment[];
    labels: string[];
    attachments: Attachment[];
    transitions: Transition[];
    components: IdName[];
    fixVersions: IdName[];
    siteDetails: DetailedSiteInfo;
    isEpic: boolean;
    epicChildren: MinimalIssue[];
    epicName: string;
    epicLink: string;
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

export interface IdName {
    id: string;
    name: string;
}

