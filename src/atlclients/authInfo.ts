'use strict';
export enum AuthProvider {
    BitbucketCloud = 'bbcloud',
    JiraCloud = 'jiracloud'
}
export interface AuthInfo {
	access:string;
    refresh:string;
    user:UserInfo;
    accessibleResources?:Array<AccessibleResource>;
}

export interface UserInfo {
    id: string;
    displayName: string;
    provider: string;
}

export interface AccessibleResource {
    id: string;
    name: string;
    scopes: Array<string>;
    avatarUrl: string;
}

export const emptyUserInfo:UserInfo = {
    id: 'empty',
    displayName: 'empty',
    provider: 'empty',
};

export const emptyAuthInfo:AuthInfo = {
    access:'empty',
    refresh:'empty',
    user: emptyUserInfo,
    accessibleResources:[]
};