import { emptyUser, emptyIssueType, User, IssueType } from "./jiraCommon";
import { emptyWorkingSite } from "../config/model";
import { AccessibleResource } from "../atlclients/authInfo";
import { EpicFieldInfo } from "./fieldManager";

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
    workingSite: emptyWorkingSite,
    isEpic: false,
    epicChildren: [],
    epicName: '',
    epicLink: ''
};

export type issueOrKey = Issue | string;


export const issueExpand = "transitions,renderedFields";

export function isIssue(a: any): a is Issue {
    return a && (<Issue>a).key !== undefined && (<Issue>a).summary !== undefined;
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

export function isIssueType(a: any): a is IssueType {
    return a && (<IssueType>a).iconUrl !== undefined && (<IssueType>a).description !== undefined;
}

export function isTransition(a: any): a is Transition {
    return a && (<Transition>a).to !== undefined && (<Transition>a).hasScreen !== undefined;
}

export function isAttachment(a: any): a is Attachment {
    return a && (<Attachment>a).mimeType !== undefined && (<Attachment>a).thumbnail !== undefined;
}

export function isIssueLinkType(a: any): a is IssueLinkType {
    return a && (<IssueLinkType>a).id !== undefined && (<IssueLinkType>a).name !== undefined && (<IssueLinkType>a).name !== undefined && (<IssueLinkType>a).name !== undefined;
}

export function issueFromJsonObject(issueJson: any, workingSite: AccessibleResource, epicFields: EpicFieldInfo): Issue {
    let jsonComments: any[] = [];
    if (issueJson.renderedFields && issueJson.renderedFields.comment && issueJson.renderedFields.comment.comments) {
        jsonComments = issueJson.renderedFields.comment.comments;
    }
    else if (issueJson.fields.comment && issueJson.fields.comment.comments) {
        jsonComments = issueJson.fields.comment.comments;
    }
    const comments = jsonComments.map((commentJson: any) => {
        if (isComment(commentJson)) { return commentJson; }

        return emptyComment;
    });

    let transitions: Transition[] = [];
    if (issueJson.transitions) {
        transitions = issueJson.transitions.map((transitionJson: any) => {
            if (isTransition(transitionJson)) { return transitionJson; }

            return emptyTransition;
        });
    }

    let attachments: Attachment[] = [];
    if (issueJson.fields.attachments) {
        attachments = issueJson.fields.attachments.map((attachmentJson: any) => {
            if (isAttachment(attachmentJson)) { return attachmentJson; }

            return emptyAttachment;
        });
    }

    let labels: string[] = [];
    if (issueJson.fields.labels && Array.isArray(issueJson.fields.labels)) {
        labels = issueJson.fields.labels;
    }
    let components: IdName[] = [];
    if (issueJson.fields.components) {
        components = issueJson.fields.components.map((componentJson: any) => { return { id: componentJson.id, name: componentJson.name }; });
    }

    let fixVersions: IdName[] = [];
    if (issueJson.fields.fixVersions) {
        fixVersions = issueJson.fields.fixVersions.map((fixVersion: any) => { return { id: fixVersion.id, name: fixVersion.name }; });
    }

    let descriptionHtml = issueJson.fields.description;
    if (issueJson.renderedFields && issueJson.renderedFields.description) {
        descriptionHtml = issueJson.renderedFields.description;
    }
    let subtasks: Issue[] = [];
    if (issueJson.fields.subtasks && Array.isArray(issueJson.fields.subtasks)) {
        subtasks = issueJson.fields.subtasks.map((subtaskJson: any) => {
            const subtaskIssue = issueFromJsonObject(subtaskJson, workingSite, epicFields);
            // subtask creation date is not returned in the api response
            subtaskIssue.created = new Date(Date.parse(issueJson.fields.created));
            return subtaskIssue;
        });
    }
    let issuelinks: IssueLink[] = [];
    if (issueJson.fields.issuelinks && Array.isArray(issueJson.fields.issuelinks)) {
        issuelinks = issueJson.fields.issuelinks
            .filter((issuelinkJson: any) => isIssueLinkType(issuelinkJson.type) && (issuelinkJson.inwardIssue || issuelinkJson.outwardIssue))
            .map((issuelinkJson: any): IssueLink => {
                if (issuelinkJson.inwardIssue) {
                    const linkedIssue = issueFromJsonObject(issuelinkJson.inwardIssue, workingSite, epicFields);
                    linkedIssue.created = new Date(Date.parse(issueJson.fields.created));
                    return {
                        id: issuelinkJson.id,
                        type: issuelinkJson.type,
                        inwardIssue: linkedIssue
                    };
                } else {
                    const linkedIssue = issueFromJsonObject(issuelinkJson.outwardIssue, workingSite, epicFields);
                    linkedIssue.created = new Date(Date.parse(issueJson.fields.created));
                    return {
                        id: issuelinkJson.id,
                        type: issuelinkJson.type,
                        outwardIssue: linkedIssue
                    };
                }
            });
    }

    const thisIssue = {
        key: issueJson.key,
        id: issueJson.id,
        self: issueJson.self,
        created: new Date(Date.parse(issueJson.fields.created)),
        description: issueJson.fields.description,
        descriptionHtml: descriptionHtml,
        summary: issueJson.fields.summary,
        status: isStatus(issueJson.fields.status) ? issueJson.fields.status : emptyStatus,
        priority: isPriority(issueJson.fields.priority) ? issueJson.fields.priority : emptyPriority,
        issueType: isIssueType(issueJson.fields.issuetype) ? issueJson.fields.issuetype : emptyIssueType,
        reporter: isUser(issueJson.fields.reporter) ? issueJson.fields.reporter : emptyUser,
        assignee: isUser(issueJson.fields.assignee) ? issueJson.fields.assignee : emptyUser,
        parentKey: issueJson.fields.parent ? issueJson.fields.parent.key : undefined,
        subtasks: subtasks,
        issuelinks: issuelinks,
        comments: comments,
        labels: labels,
        attachments: attachments,
        transitions: transitions,
        components: components,
        fixVersions: fixVersions,
        workingSite: workingSite,
        isEpic: (issueJson.fields[epicFields.epicName.id] && issueJson.fields[epicFields.epicName.id] !== ''),
        epicName: issueJson.fields[epicFields.epicName.id],
        epicLink: issueJson.fields[epicFields.epicLink.id],
        epicChildren: []
    };

    return thisIssue;
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
    workingSite: AccessibleResource;
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

export interface IssueLinkType {
    id: string;
    name: string;
    inward: string;
    outward: string;
}

export interface IssueLink {
    id: string;
    type: IssueLinkType;
    inwardIssue?: Issue;
    outwardIssue?: Issue;
}