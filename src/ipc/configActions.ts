import { Action } from "./messaging";

export interface AuthAction extends Action {
    provider: string;
}

export interface SaveSettingsAction extends Action {
    changes: {
        [key: string]: any;
    };
    removes?: string[];
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
