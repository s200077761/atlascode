
export namespace JiraKit {
    export type Any = any;
    export type AnyObject = object;

    export type Headers = {
        [header: string]: any
    };

    export interface Options {
        baseUrl?: string;
        headers?: Headers;
        options?: AnyObject;
    }

    interface AuthBasic {
        type: "basic";
        username: string;
        password: string;
        }

        interface AuthAppPassword {
        type: "apppassword";
        username: string;
        password: string;
        }

        interface AuthToken {
        type: "token";
        token: string;
        }

    export type Auth =
    | AuthBasic
    | AuthAppPassword
    | AuthToken;
}


export class JiraKit {
    constructor(options = {}) {}
    
    public authenticate(auth: JiraKit.Auth): void {}
}

