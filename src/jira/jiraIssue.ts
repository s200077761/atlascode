import { emptyUser, emptyIssueType, User, IssueType } from "./jiraCommon";
import { WorkingSite } from "../config/model";

    export const emptyStatusCategory:StatusCategory = {
        colorName: '',
        id: -1,
        key: '',
        name: '',
        self: ''
    };

    export const emptyStatus:Status = {
        description: '',
        iconUrl: '',
        id: '',
        name: '',
        self: '',
        statusCategory: emptyStatusCategory
    };

    export const emptyComment:Comment = {
        author: emptyUser,
        body: '',
        created: '',
        id: '',
        self: ''
    };

    export const emptyTransition:Transition = {
        hasScreen: false,
        id: '',
        isConditional: false,
        isGlobal: false,
        isInitial: false,
        name: '',
        to: emptyStatus,
    };

    export const emptyAttachment:Attachment = {
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

    export const emptyWorkingSite: WorkingSite = {
        name: '',
        id: '',
        scopes: [],
        avatarUrl: ''
    };

    export const emptyIssue:Issue = {
        key: '',
        id: '',
        self: '',
        description: '',
        summary: '',
        status: emptyStatus,
        issueType: emptyIssueType,
        reporter: emptyUser,
        assignee: emptyUser,
        comments: [],
        labels: [],
        attachments: [],
        transitions: [],
        workingSite: emptyWorkingSite
    };

    export type issueOrKey = Issue | string;

    export const issueFields: string[] = ["summary", "description", "comment", "issuetype", "status", "created", "reporter", "assignee", "labels", "attachment", "status"];
    export const issueExpand = "transitions";

    export function isIssue(a:any): a is Issue {
        return a && (<Issue>a).key !== undefined && (<Issue>a).summary !== undefined;
    }

    export function isComment(a:any): a is Comment {
        return a && (<Comment>a).author !== undefined && (<Comment>a).body !== undefined;
    }

    export function isUser(a:any): a is User {
        return a && (<User>a).displayName !== undefined && (<User>a).avatarUrls !== undefined;
    }

    export function isStatus(a:any): a is Status {
        return a && (<Status>a).iconUrl !== undefined && (<Status>a).statusCategory !== undefined;
    }

    export function isIssueType(a:any): a is IssueType {
        return a && (<IssueType>a).iconUrl !== undefined && (<IssueType>a).description !== undefined;
    }

    export function isTransition(a:any): a is Transition {
        return a && (<Transition>a).to !== undefined && (<Transition>a).hasScreen !== undefined;
    }

    export function isAttachment(a:any): a is Attachment {
        return a && (<Attachment>a).mimeType !== undefined && (<Attachment>a).thumbnail !== undefined;
    }

    export function issueFromJsonObject(issueJson: any, workingSite: WorkingSite): Issue {
        let comments:Comment[] = [];
        if(issueJson.fields.comment && issueJson.fields.comment.comments) {
            comments = issueJson.fields.comment.comments.map((commentJson: any) => {
                if(isComment(commentJson)) { return commentJson; }
    
                return emptyComment;
            });
        }
        
        let transitions:Transition[] = [];
        if(issueJson.transitions) {
            transitions = issueJson.transitions.map((transitionJson: any) => {
                if(isTransition(transitionJson)) { return transitionJson; }

                return emptyTransition;
            });
        }

        let attachments:Attachment[] = [];
        if(issueJson.fields.attachments) {
            attachments = issueJson.fields.attachments.map((attachmentJson: any) => {
                if(isAttachment(attachmentJson)) { return attachmentJson; }
    
                return emptyAttachment;
            });
        }

        return {
            key: issueJson.key,
            id: issueJson.id,
            self: issueJson.self,
            description: issueJson.fields.description,
            summary: issueJson.fields.summary,
            status: isStatus(issueJson.fields.status) ? issueJson.fields.status : emptyStatus,
            issueType: isIssueType(issueJson.fields.issuetype) ? issueJson.fields.issuetype : emptyIssueType,
            reporter: isUser(issueJson.fields.reporter) ? issueJson.fields.reporter : emptyUser,
            assignee: isUser(issueJson.fields.assignee) ? issueJson.fields.assignee : emptyUser,
            comments: comments,
            labels: issueJson.fields.labels,
            attachments: attachments,
            transitions: transitions,
            workingSite: workingSite
        };
    }


    export interface Issue {
        key: string;
        id: string;
        self: string;
        description: string;
        summary: string;
        status: Status;
        issueType: IssueType;
        reporter: User;
        assignee: User;
        comments: Comment[];
        labels: string[];
        attachments: Attachment[];
        transitions: Transition[];
        workingSite: WorkingSite;
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