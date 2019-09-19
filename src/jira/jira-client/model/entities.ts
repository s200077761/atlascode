import { DetailedSiteInfo } from "../../../atlclients/authInfo";

export type MinimalIssueOrKeyAndSite = MinimalIssue | IssueKeyAndSite;

export interface MinimalIssue {
    key: string;
    id: string;
    self: string;
    created?: Date;
    updated: Date;
    description: string;
    descriptionHtml: string;
    summary: string;
    status: Status;
    priority: Priority;
    issuetype: IssueType;
    parentKey?: string;
    subtasks: IssueLinkIssue[];
    issuelinks: MinimalIssueLink[];
    transitions: Transition[];
    siteDetails: DetailedSiteInfo;
    isEpic: boolean;
    epicChildren: MinimalIssue[];
    epicName: string;
    epicLink: string;
}

export type IssueKeyAndSite = Pick<MinimalIssue, 'siteDetails' | 'key'>;
export type IssueLinkIssue = Pick<MinimalIssue, 'siteDetails' | 'id' | 'self' | 'key' | 'created' | 'summary' | 'status' | 'priority' | 'issuetype'>;
export const IssueLinkIssueKeys: string[] = ['id', 'self', 'key', 'created', 'summary', 'status', 'priority', 'issuetype'];
export type MinimalORIssueLink = MinimalIssue | IssueLinkIssue;

export function readIssueLinkIssues(values: any[], siteDetails: DetailedSiteInfo): IssueLinkIssue[] {
    return values.map(val => {
        return readIssueLinkIssue(val, siteDetails);
    });
}

export function readIssueLinkIssue(value: any, siteDetails: DetailedSiteInfo): IssueLinkIssue {

    if (isMinimalIssue(value)) {
        return {
            id: value.id,
            key: value.key,
            self: value.self,
            summary: value.summary,
            status: value.status,
            priority: value.priority,
            issuetype: value.issuetype,
            siteDetails: siteDetails
        };
    }

    return {
        id: value.id,
        key: value.key,
        self: value.self,
        summary: value.fields['summary'],
        status: value.fields['status'],
        priority: value.fields['priority'],
        issuetype: value.fields['issuetype'],
        siteDetails: siteDetails
    };
}

export interface MinimalIssueLink {
    id: string;
    type: IssueLinkType;
    inwardIssue?: IssueLinkIssue;
    outwardIssue?: IssueLinkIssue;
}

export function readMinimalIssueLinks(values: any[], siteDetails: DetailedSiteInfo): MinimalIssueLink[] {
    return values.map(val => {
        return readMinimalIssueLink(val, siteDetails);
    });
}

export function readMinimalIssueLink(value: any, siteDetails: DetailedSiteInfo): MinimalIssueLink {
    return {
        id: value.id,
        type: value.type,
        inwardIssue: (value.inwardIssue) ? readIssueLinkIssue(value.inwardIssue, siteDetails) : undefined,
        outwardIssue: (value.outwardIssue) ? readIssueLinkIssue(value.outwardIssue, siteDetails) : undefined,
    };
}

export interface Component {
    id: string;
    name: string;
}

export function readComponent(value: any): Component {
    return {
        id: value.id,
        name: value.name,
    };
}

export interface Version {
    id: string;
    name: string;
    archived: boolean;
    released: boolean;
}

export function readVersion(params: any): Version {
    return {
        id: params.id,
        name: params.name,
        archived: params.archived,
        released: params.released,
    };
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

export interface Transition {
    hasScreen: boolean;
    id: string;
    isConditional: boolean;
    isGlobal: boolean;
    isInitial: boolean;
    name: string;
    to: Status;
}

export interface IssueType {
    avatarId: number;
    description: string;
    iconUrl: string;
    id: string;
    name: string;
    self: string;
    subtask: boolean;
}

export interface IssueLinkType {
    id: string;
    name: string;
    inward: string;
    outward: string;
}

export interface Comment {
    author: User;
    body: string;
    renderedBody?: string;
    created: string;
    id: string;
    self: string;
}

export interface WorklogContainer {
    worklogs: Worklog[];
    total: number;
}

export interface Worklog {
    author: User;
    updateAuthor: User;
    comment: string;
    timeSpent: string;
    timeSpentSeconds: number;
    id: string;
    issueId: string;
    created: string;
    updated: string;
    started: string;
}
export interface User {
    accountId: string;
    active: boolean;
    avatarUrls: Avatars;
    displayName: string;
    emailAddress: string | undefined;
    key: string | undefined;
    self: string;
    timeZone: string | undefined;
}


export interface Watches {
    isWatching: boolean;
    watchCount: number;
    watchers: User[];
}

export interface Votes {
    hasVoted: boolean;
    votes: number;
    voters: User[];
}

export interface Avatars {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
}

export interface Attachment {
    id: string;
    filename: string;
    author: User;
    created: string;
    size: string;
    mimeType: string;
    content: string;
    thumbnail: string;
}

export interface Project {
    id: string;
    name: string;
    key: string;
    avatarUrls: {
        [k: string]: string;
    };
    projectTypeKey: string;
    self: string;
    simplified: boolean;
    style: string;
    isPrivate: boolean;
}

export function readProject(projectJson: any): Project {
    let avatarUrls: { [k: string]: string } = {};
    if (projectJson.avatarUrls) {
        avatarUrls = projectJson.avatarUrls;
    }

    return {
        id: projectJson.id,
        name: projectJson.name,
        key: projectJson.key,
        avatarUrls: avatarUrls,
        projectTypeKey: projectJson.projectTypeKey,
        self: projectJson.self,
        simplified: projectJson.simplified,
        style: projectJson.style,
        isPrivate: projectJson.isPrivate,
    };
}

export function readWatches(watchesJson: any): Watches {
    if (watchesJson) {
        return {
            isWatching: watchesJson.isWatching,
            watchCount: watchesJson.watchCount,
            watchers: Array.isArray(watchesJson.watchers) ? watchesJson.watchers : [],
        };
    }

    return {
        isWatching: false,
        watchCount: 0,
        watchers: [],
    };
}

export function readVotes(votesJson: any): Votes {
    if (votesJson) {
        return {
            hasVoted: votesJson.hasVoted,
            votes: votesJson.votes,
            voters: Array.isArray(votesJson.voters) ? votesJson.voters : [],
        };
    }

    return {
        hasVoted: false,
        votes: 0,
        voters: [],
    };
}

export function isMinimalIssue(a: any): a is MinimalIssue {
    return a && (<MinimalIssue>a).key !== undefined
        && (<MinimalIssue>a).transitions !== undefined
        && (<MinimalIssue>a).id !== undefined
        && (<MinimalIssue>a).summary !== undefined
        && (<MinimalIssue>a).status !== undefined
        && (<MinimalIssue>a).issuetype !== undefined;

}

export function isIssueKeyAndSite(a: any): a is IssueKeyAndSite {
    return a && (<IssueKeyAndSite>a).key !== undefined
        && (<IssueKeyAndSite>a).siteDetails !== undefined;
}

export function isIssueType(a: any): a is IssueType {
    return a && (<IssueType>a).iconUrl !== undefined && (<IssueType>a).description !== undefined;
}

export function isIssueLinkType(a: any): a is IssueLinkType {
    return a && (<IssueLinkType>a).id !== undefined && (<IssueLinkType>a).name !== undefined && (<IssueLinkType>a).inward !== undefined && (<IssueLinkType>a).outward !== undefined;
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

export function isProject(a: any): a is Project {
    return (
        a &&
        (<Project>a).key !== undefined &&
        (<Project>a).name !== undefined &&
        (<Project>a).id !== undefined &&
        (<Project>a).projectTypeKey !== undefined
    );
}

export function isProjectArray(a: any): a is Project[] {
    return (
        Array.isArray(a)
        && (a.length > 0)
        && isProject(a[0])
    );
}

export function isComment(a: any): a is Comment {
    return a && (<Comment>a).author !== undefined && (<Comment>a).body !== undefined;
}
