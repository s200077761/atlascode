import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { AuthInfo, DetailedSiteInfo, SiteInfo } from '../../../atlclients/authInfo';
import { ConfigTarget } from '../models/config';
import { CommonAction } from './common';

export enum OnboardingActionType {
    Login = 'login',
    Logout = 'logout',
    SaveSettings = 'saveSettings',
    CreateJiraIssue = 'createJiraIssue',
    ViewJiraIssue = 'viewJiraIssue',
    CreatePullRequest = 'createPullRequest',
    ViewPullRequest = 'viewPullRequest'
}

export type OnboardingAction =
    | ReducerAction<OnboardingActionType.Login, LoginAuthAction>
    | ReducerAction<OnboardingActionType.Logout, LogoutAuthAction>
    | ReducerAction<OnboardingActionType.SaveSettings, SaveSettingsAction>
    | ReducerAction<OnboardingActionType.CreateJiraIssue>
    | ReducerAction<OnboardingActionType.ViewJiraIssue>
    | ReducerAction<OnboardingActionType.CreatePullRequest>
    | ReducerAction<OnboardingActionType.ViewPullRequest>
    | CommonAction;

export interface AuthAction {
    siteInfo: SiteInfo;
}

export interface LoginAuthAction extends AuthAction {
    authInfo: AuthInfo;
}

export interface LogoutAuthAction extends AuthAction {
    siteInfo: DetailedSiteInfo;
}

export interface SaveSettingsAction {
    target: ConfigTarget;
    changes: {
        [key: string]: any;
    };
    removes?: string[];
}
