import { DetailedSiteInfo } from "../../../atlclients/authInfo";

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
    created: string;
    id: string;
    self: string;
}

export interface User {
    accountId: string;
    active: boolean;
    avatarUrls: Avatars;
    displayName: string;
    emailAddress: string | undefined;
    key: string | undefined;
    name: string | undefined;
    self: string;
    timeZone: string | undefined;
}

export interface Avatars {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
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

export function isMinimalIssue(a: any): a is MinimalIssue {
    return a && (<MinimalIssue>a).key !== undefined
        && (<MinimalIssue>a).summary !== undefined;
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

export function isComment(a: any): a is Comment {
    return a && (<Comment>a).author !== undefined && (<Comment>a).body !== undefined;
}
