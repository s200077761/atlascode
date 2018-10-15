
declare module 'passport-atlassian-oauth2' {
    import * as OAuth2Strategy from 'passport-oauth2';

    type VerifyCallback = (err?: Error | null, user?: object, info?: object) => void;

    type VerifyFunction =
        ((accessToken: string, refreshToken: string, profile: any, verified: VerifyCallback) => void) |
        ((accessToken: string, refreshToken: string, results: any, profile: any, verified: VerifyCallback) => void);

    interface _StrategyOptionsBase {
        authorizationURL?: string;
        tokenURL?: string;
        clientID: string;
        clientSecret: string;
        callbackURL: string;
        scope: string;
    }
    interface StrategyOptions extends _StrategyOptionsBase {
        passReqToCallback?: false;
    }

    export class Strategy extends OAuth2Strategy {
        constructor(options: StrategyOptions, verify: VerifyFunction);
       // constructor(options: Object, verify: OAuth2Strategy.VerifyFunction);
    }
}
