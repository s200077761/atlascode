import { AuthInfo, DetailedSiteInfo, SiteInfo } from '../atlclients/authInfo';
import { Action } from './messaging';

export enum FeedbackType {
    Bug = 'bug',
    Comment = 'comment',
    Suggestion = 'suggestion',
    Question = 'question',
    Empty = ''
}
export interface FeedbackData {
    type: FeedbackType;
    description: string;
    canBeContacted: boolean;
    userName: string;
    emailAddress: string;
}

export interface LoginAuthAction extends Action {
    siteInfo: SiteInfo;
    authInfo: AuthInfo;
}

export interface LogoutAuthAction extends Action {
    detailedSiteInfo: DetailedSiteInfo;
}

export interface EditAuthAction extends Action {
    detailedSiteInfo: DetailedSiteInfo;
    authInfo: AuthInfo;
}

export enum ConfigTarget {
    User = 'user',
    Workspace = 'workspace',
    WorkspaceFolder = 'workspacefolder'
}
export interface SaveSettingsAction extends Action {
    target: ConfigTarget;
    targetUri: string;
    changes: {
        [key: string]: any;
    };
    removes?: string[];
}

export interface OpenJsonAction extends Action {
    target: ConfigTarget;
}

export interface SubmitFeedbackAction extends Action {
    feedback: FeedbackData;
}

export interface FetchJqlDataAction extends Action {
    site: DetailedSiteInfo;
    path: string;
}

export interface FetchJiraFiltersAction extends Action {
    site: DetailedSiteInfo;
}

export interface FetchSearchJiraFiltersAction extends Action {
    site: DetailedSiteInfo;
    query: string;
}

export function isFetchJqlDataAction(a: Action): a is FetchJqlDataAction {
    return (
        a &&
        (<FetchJqlDataAction>a).site !== undefined &&
        (<FetchJqlDataAction>a).path !== undefined &&
        (<FetchJqlDataAction>a).path !== ''
    );
}

export function isFetchJiraFiltersAction(a: Action): a is FetchJiraFiltersAction {
    return a && (<FetchJiraFiltersAction>a).site !== undefined;
}

export function isFetchSearchJiraFiltersAction(a: Action): a is FetchSearchJiraFiltersAction {
    return (
        a &&
        (<FetchSearchJiraFiltersAction>a).site !== undefined &&
        (<FetchSearchJiraFiltersAction>a).query !== undefined
    );
}

export function isLogoutAuthAction(a: Action): a is LogoutAuthAction {
    return (<LogoutAuthAction>a).detailedSiteInfo !== undefined && (<LogoutAuthAction>a).action === 'logout';
}

export function isEditAuthAction(a: Action): a is EditAuthAction {
    return (<EditAuthAction>a).detailedSiteInfo !== undefined
        && (<EditAuthAction>a).authInfo !== undefined
        && (<EditAuthAction>a).action === 'edit';
}

export function isLoginAuthAction(a: Action): a is LoginAuthAction {
    return (
        (<LoginAuthAction>a).siteInfo !== undefined &&
        (<LoginAuthAction>a).authInfo !== undefined &&
        (<LoginAuthAction>a).action === 'login'
    );
}

export function isSaveSettingsAction(a: Action): a is SaveSettingsAction {
    return a && (<SaveSettingsAction>a).changes !== undefined && (<SaveSettingsAction>a).target !== undefined;
}

export function isOpenJsonAction(a: Action): a is OpenJsonAction {
    return a && (<OpenJsonAction>a).target !== undefined;
}

export function isSubmitFeedbackAction(a: Action): a is SubmitFeedbackAction {
    return (<SubmitFeedbackAction>a).feedback !== undefined;
}
