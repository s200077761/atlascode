'use strict';

export const ProductJira = 'Jira';
export const ProductJiraStaging = 'Jira Staging';
export const ProductBitbucket = 'Bitbucket';
export const ProductBitbucketStaging = 'Bitbucket Staging';

export enum AuthProvider {
    BitbucketCloud = 'bbcloud',
    BitbucketCloudStaging = 'bbcloudstaging',
    JiraCloud = 'jiracloud',
    JiraCloudStaging = 'jiracloudstaging'
}
export interface AuthInfo {
    access: string;
    refresh: string;
    user: UserInfo;
    accessibleResources?: Array<AccessibleResource>;
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
    baseUrlSuffix: string;
}

export const emptyUserInfo: UserInfo = {
    id: 'empty',
    displayName: 'empty',
    provider: 'empty',
};

export const emptyAuthInfo: AuthInfo = {
    access: 'empty',
    refresh: 'empty',
    user: emptyUserInfo,
    accessibleResources: []
};

export function productForProvider(provider: string): string {
    switch (provider) {
        case AuthProvider.JiraCloud: {
            return ProductJira;
        }
        case AuthProvider.JiraCloudStaging: {
            return ProductJiraStaging;
        }
        case AuthProvider.BitbucketCloud: {
            return ProductBitbucket;
        }
        case AuthProvider.BitbucketCloudStaging: {
            return ProductBitbucketStaging;
        }
    }

    return "unknown product";
}

export function providerForSite(site: AccessibleResource): string {
    let suffix = site.baseUrlSuffix;

    if (!suffix || suffix.length < 1) {
        suffix = 'atlassian.net';
    }

    if (suffix === 'jira-dev.com') {
        return AuthProvider.JiraCloudStaging;
    }

    return AuthProvider.JiraCloud;
}