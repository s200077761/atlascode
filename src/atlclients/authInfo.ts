'use strict';
export interface AuthInfo {
	access:string;
    refresh:string;
    user:UserInfo;
    accessibleResources?:Array<AccessibleResource>;
}

export interface UserInfo {
    id: string;
    displayName: string;
    username: string;
    profileUrl: string;
    provider: string;
}

export interface AccessibleResource {
    id: string;
    name: string;
    scopes: Array<string>;
    avatarUrl: string;
}