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

    export const emptyIssueType:IssueType = {
        avatarId: -1,
        description: '',
        iconUrl: '',
        id: '',
        name: '',
        self: '',
        subtask: false
    };

    export interface IssueType {
        avatarId: number;
        description: string;
        iconUrl: string;
        id: string;
        name: string;
        self: string;
        subtask: boolean;
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