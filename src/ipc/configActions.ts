import { Action } from "./messaging";
import { SiteInfo, AuthInfo, DetailedSiteInfo } from "../atlclients/authInfo";

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

export interface AuthAction extends Action {
    siteInfo: SiteInfo;
}

export interface LoginAuthAction extends AuthAction {
    authInfo: AuthInfo;

}

export interface SaveSettingsAction extends Action {
    changes: {
        [key: string]: any;
    };
    removes?: string[];
}

export interface SubmitFeedbackAction extends Action {
    feedback: FeedbackData;
}

export interface FetchJqlDataAction extends Action {
    site: DetailedSiteInfo;
    path: string;
}

export function isFetchJqlDataAction(a: Action): a is FetchJqlDataAction {
    return a && (<FetchJqlDataAction>a).site !== undefined
        && (<FetchJqlDataAction>a).path !== undefined
        && (<FetchJqlDataAction>a).path !== '';
}

export function isAuthAction(a: Action): a is AuthAction {
    return (<AuthAction>a).siteInfo !== undefined
        && (
            (<AuthAction>a).action === 'login'
            || (<AuthAction>a).action === 'logout'
        );
}

export function isLoginAuthAction(a: Action): a is LoginAuthAction {
    return (<LoginAuthAction>a).siteInfo !== undefined
        && (<LoginAuthAction>a).authInfo !== undefined
        && (<LoginAuthAction>a).action === 'login';
}

export function isSaveSettingsAction(a: Action): a is SaveSettingsAction {
    return (<SaveSettingsAction>a).changes !== undefined;
}

export function isSubmitFeedbackAction(a: Action): a is SubmitFeedbackAction {
    return (<SubmitFeedbackAction>a).feedback !== undefined;
}
