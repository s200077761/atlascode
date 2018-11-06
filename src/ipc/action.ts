
export interface Action {
    action:string;
}

export interface Alert extends Action {
    message:string;
}

export function isAlertable(a:Action): a is Alert {
    return (<Alert>a).message !== undefined;
}