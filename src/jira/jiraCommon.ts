export const emptyAvatars: Avatars = { '48x48': '', '24x24': '', '16x16': '', '32x32': '' };

export const emptyUser: User = {
    accountId: '',
    active: true,
    avatarUrls: emptyAvatars,
    displayName: '',
    emailAddress: '',
    key: '',
    name: '',
    self: '',
    timeZone: ''
};

export const emptyIssueType: IssueType = {
    avatarId: -1,
    description: '',
    iconUrl: '',
    id: '',
    name: '',
    self: '',
    subtask: false
};

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

export const emptyTransition: Transition = {
    hasScreen: false,
    id: '',
    isConditional: false,
    isGlobal: false,
    isInitial: false,
    name: '',
    to: emptyStatus,
};

export const epicsDisabled: EpicFieldInfo = {
    epicLink: { name: "", id: "", cfid: 0 },
    epicName: { name: "", id: "", cfid: 0 },
    epicsEnabled: false
};

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

export interface CFIdName {
    id: string;
    name: string;
    cfid: number;
}

export interface EpicFieldInfo {
    epicName: CFIdName;
    epicLink: CFIdName;
    epicsEnabled: boolean;
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

export interface User {
    accountId: string;
    active: boolean;
    avatarUrls: Avatars;
    displayName: string;
    emailAddress: string;
    key: string;
    name: string;
    self: string;
    timeZone: string;
}

export interface JiraSettings {

}

export interface Avatars {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
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
