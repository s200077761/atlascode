import { Action } from "./messaging";

export enum FeedbackType {
    Bug ='bug',
    Comment = 'comment',
    Suggestion = 'suggestion',
    Question = 'question',
    Empty = ''
}
export interface FeedbackData {
    type: FeedbackType;
    description:string;
    canBeContacted:boolean;
}

export interface AuthAction extends Action {
    provider: string;
}

export interface SaveSettingsAction extends Action {
    changes: {
        [key: string]: any;
    };
    removes?: string[];
}

export interface SubmitFeedbackAction extends Action {
    feedback:FeedbackData;
}

export function isAuthAction(a: Action): a is AuthAction {
    return (<AuthAction>a).provider !== undefined 
    && (
        (<AuthAction>a).action === 'login'
        || (<AuthAction>a).action === 'logout'
       );
}

export function isSaveSettingsAction(a: Action): a is SaveSettingsAction {
    return (<SaveSettingsAction>a).changes !== undefined;
}

export function isSubmitFeedbackAction(a: Action): a is SubmitFeedbackAction {
    return (<SubmitFeedbackAction>a).feedback !== undefined;
}
