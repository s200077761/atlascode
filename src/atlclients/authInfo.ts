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