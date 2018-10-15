
declare module 'passport-oauth2-refresh' {
    import { Strategy } from 'passport';

    type DoneFunction = ((err:Error, accessToken:string, refreshToken:string) => void);
        interface Authenticator {
            use(strategy: Strategy): this;
            use(name: string, strategy: Strategy): this;
            has(name:string):boolean;
            requestNewAccessToken(name:string, refreshToken:string, done:DoneFunction):void;
        }

    const refresh: Authenticator;
    export = refresh;
}

