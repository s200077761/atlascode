

export namespace JiraIssue {
    export const emptyAvatars:Avatars = {'48x48':'','24x24':'','16x16':'','32x32':''};
    export const emptyUser:User = {
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

    export const emptyIssueType:IssueType = {
        avatarId: -1,
        description: '',
        iconUrl: '',
        id: '',
        name: '',
        self: '',
        subtask: false
    };

    export const emptyComment:Comment = {
        author: emptyUser,
        body: '',
        created: '',
        id: '',
        self: ''
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
        attachments: []
    };

    export type issueOrKey = Issue | string;

    export const issueFields: string[] = ["summary", "description", "comment", "issuetype", "status", "created", "reporter", "assignee", "labels", "attachment", "status"];

    export function isIssue(a:any): a is Issue {
        return a && (<Issue>a).key !== undefined && a.summary !== undefined;
    }

    export function isComment(a:any): a is Comment {
        return a && (<Comment>a).author !== undefined && a.body !== undefined;
    }

    export function isUser(a:any): a is User {
        return a && (<User>a).displayName !== undefined && a.avatarUrls !== undefined;
    }

    export function isStatus(a:any): a is Status {
        return a && (<Status>a).iconUrl !== undefined && a.statusCategory !== undefined;
    }

    export function isIssueType(a:any): a is IssueType {
        return a && (<IssueType>a).iconUrl !== undefined && a.description !== undefined;
    }

    export function fromJsonObject(issueJson: any): Issue {
        const comments:Comment[] = issueJson.fields.comment.comments.map((commentJson: any) => {
            if(isComment(commentJson)) { return commentJson; }

            return emptyComment;
        });
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
            labels: [],
            attachments: []
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

    export interface IssueType {
        avatarId: number;
        description: string;
        iconUrl: string;
        id: string;
        name: string;
        self: string;
        subtask: boolean;
    }

    // TODO:
    export interface Attachment {
        author?: User;
        content?: string;
        created?: string;
        filename?: string;
        id?: number;
        mimeType?: string;
        self?: string;
        size?: number;
        thumbnail?: string;
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
        emailAddress: string;
        key: string;
        name: string;
        self: string;
        timeZone: string;
    }

    export interface Avatars {
        '48x48':string;
        '24x24':string;
        '16x16':string;
        '32x32':string;
    }
}
