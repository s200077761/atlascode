import * as vscode from 'vscode';
const BitbucketStrategy = require('passport-bitbucket-oauth2');
const AtlassianStrategy = require('passport-atlassian-oauth2');
import * as refresh from 'passport-oauth2-refresh';
import { Logger } from '../logger';
import * as express from 'express';
import * as passport from 'passport';
import * as http from 'http';
import { Resources } from '../resources';
import { Time } from '../util/time';
import { ProductBitbucket, ProductJira, OAuthProvider, AccessibleResource, OAuthResponse } from './authInfo';

const vscodeurl = vscode.version.endsWith('-insider') ? 'vscode-insiders://file' : 'vscode://file';

export class OAuthDancer {
    private _srv: http.Server | undefined;
    private _app: any;
    private _authInfo: Map<OAuthProvider, OAuthResponse> = new Map();
    private _authErrors: Map<OAuthProvider, string> = new Map();
    private _authsInFlight: OAuthProvider[] = [];
    private _timeoutTimers: Map<OAuthProvider, any> = new Map();
    private _browserTimeout = 5 * Time.MINUTES;

    private _bbCloudStrategy = new BitbucketStrategy.Strategy({
        clientID: "3hasX42a7Ugka2FJja",
        clientSecret: "st7a4WtBYVh7L2mZMU8V5ehDtvQcWs9S",
        callbackURL: "http://127.0.0.1:31415/" + OAuthProvider.BitbucketCloud
    }, this.verifyBitbucket.bind(this));

    private _bbCloudStrategyStaging = new BitbucketStrategy.Strategy({
        clientID: "7jspxC7fgemuUbnWQL",
        clientSecret: "sjHugFh6SVVshhVE7PUW3bgXbbQDVjJD",
        callbackURL: "http://127.0.0.1:31415/" + OAuthProvider.BitbucketCloudStaging,
        authorizationURL: "https://staging.bb-inf.net/site/oauth2/authorize",
        tokenURL: "https://staging.bb-inf.net/site/oauth2/access_token",
        userProfileURL: "https://api-staging.bb-inf.net/2.0/user"
    }, this.verifyBitbucketStaging.bind(this));

    private _jiraCloudStrategy = new AtlassianStrategy({
        clientID: 'bJChVgBQd0aNUPuFZ8YzYBVZz3X4QTe2',
        clientSecret: 'P0sl4EwwnXUHZoZgMLi2G6jzeCS1rRI8-w8X0kPf6A1XXQRC5_-F252BhbxgeI3b',
        callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.JiraCloud,
        scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
    }, this.verifyJira.bind(this));

    private _jiraCloudStrategyStaging = new AtlassianStrategy({
        clientID: 'pmzXmUav3Rr5XEL0Sie7Biec0WGU8BKg',
        clientSecret: 'u8PPS8h23z5575nWvy5fsI77J1UBw1J-IlvTgfZXV9mibpXsQF9aJcbYf7e8yeSu',
        authorizationURL: "https://auth.stg.atlassian.com/authorize",
        tokenURL: "https://auth.stg.atlassian.com/oauth/token",
        profileURL: "https://api.stg.atlassian.com/me",
        accessibleResourcesURL: 'https://api.stg.atlassian.com/oauth/token/accessible-resources',
        callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.JiraCloudStaging,
        scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
    }, this.verifyJiraStaging.bind(this));

    public constructor() {
        passport.serializeUser(function (user, done) {
            done(null, user);
        });

        passport.deserializeUser(function (obj, done) {
            done(null, obj);
        });

        this._jiraCloudStrategyStaging.authorizationParams = () => {
            return {
                audience: 'api.stg.atlassian.com',
                prompt: 'consent',
            };
        };

        passport.use(OAuthProvider.BitbucketCloud, this._bbCloudStrategy);
        passport.use(OAuthProvider.BitbucketCloudStaging, this._bbCloudStrategyStaging);
        passport.use(OAuthProvider.JiraCloud, this._jiraCloudStrategy);
        passport.use(OAuthProvider.JiraCloudStaging, this._jiraCloudStrategyStaging);
        refresh.use(OAuthProvider.BitbucketCloud, this._bbCloudStrategy);
        refresh.use(OAuthProvider.BitbucketCloudStaging, this._bbCloudStrategyStaging);
        refresh.use(OAuthProvider.JiraCloud, this._jiraCloudStrategy);
        refresh.use(OAuthProvider.JiraCloudStaging, this._jiraCloudStrategyStaging);

        this._app = this.createApp();
    }

    private createApp(): any {
        let app = express();
        app.use(passport.initialize());
        app.use(passport.session());

        app.get('/auth/' + OAuthProvider.BitbucketCloud,
            passport.authenticate(OAuthProvider.BitbucketCloud),
            function (req, res) {
                // The request will be redirected to Bitbucket for authentication, so this
                // function will not be called.
            });

        app.get('/auth/' + OAuthProvider.BitbucketCloudStaging,
            passport.authenticate(OAuthProvider.BitbucketCloudStaging),
            function (req, res) {
                // The request will be redirected to Bitbucket for authentication, so this
                // function will not be called.
            });

        app.get('/auth/' + OAuthProvider.JiraCloud,
            passport.authenticate(OAuthProvider.JiraCloud),
            function (req, res) {
                // The request will be redirected to Bitbucket for authentication, so this
                // function will not be called.
            });

        app.get('/auth/' + OAuthProvider.JiraCloudStaging,
            passport.authenticate(OAuthProvider.JiraCloudStaging),
            function (req, res) {
                // The request will be redirected to Bitbucket for authentication, so this
                // function will not be called.
            });

        app.get('/' + OAuthProvider.BitbucketCloud, passport.authenticate(OAuthProvider.BitbucketCloud, { failureRedirect: '/error' }), (req, res) => {

            res.send(Resources.html.get('authSuccessHtml')!({
                product: ProductBitbucket,
                vscodeurl: vscodeurl
            }));
            this.shutdown(OAuthProvider.BitbucketCloud);
        });

        app.get('/' + OAuthProvider.BitbucketCloudStaging, passport.authenticate(OAuthProvider.BitbucketCloudStaging, { failureRedirect: '/error' }), (req, res) => {

            res.send(Resources.html.get('authSuccessHtml')!({
                product: ProductBitbucket,
                vscodeurl: vscodeurl
            }));
            this.shutdown(OAuthProvider.BitbucketCloudStaging);
        });

        app.get('/' + OAuthProvider.JiraCloud, passport.authenticate(OAuthProvider.JiraCloud, { failureRedirect: '/error' }), (req, res) => {

            res.send(Resources.html.get('authSuccessHtml')!({
                product: ProductJira,
                vscodeurl: vscodeurl
            }));
            this.shutdown(OAuthProvider.JiraCloud);
        });

        app.get('/' + OAuthProvider.JiraCloudStaging, passport.authenticate(OAuthProvider.JiraCloudStaging, { failureRedirect: '/error' }), (req, res) => {

            res.send(Resources.html.get('authSuccessHtml')!({
                product: ProductJira,
                vscodeurl: vscodeurl
            }));
            this.shutdown(OAuthProvider.JiraCloudStaging);

        });

        app.get('/error', (req, res) => {
            // NOTE: If this fires, it means something went very wrong inside of passort or our verify method.
            // At this point we have no option but to shut everyone down!
            Logger.debug("got authentication error", req.query);
            res.send(Resources.html.get('authFailureHtml')!({
                errMessage: "We weren't able to authorize your account.",
                actionMessage: 'Give it a moment and try again.',
                vscodeurl: vscodeurl
            }));
            this.forceShutdownAll();
        });

        app.get('/timeout', (req, res) => {
            let provider = req.query.provider;
            this._authErrors.set(provider, `'Authorization did not complete in the time alotted for '${provider}'`);
            Logger.debug("oauth timed out", req.query);
            res.send(Resources.html.get('authFailureHtml')!({
                errMessage: 'Authorization did not complete in the time alotted.',
                actionMessage: 'Please try again.',
                vscodeurl: vscodeurl
            }));
            this.shutdown(req.query.provider);
        });

        return app;
    }

    private verify(provider: OAuthProvider, accessToken: string, refreshToken: string, profile: any, done: any): void {
        let resources: AccessibleResource[] = [];

        if (profile.accessibleResources) {
            profile.accessibleResources.forEach((resource: AccessibleResource) => {
                resources.push(resource);
            });
        }

        this._authInfo.set(provider, {
            access: accessToken,
            refresh: refreshToken,
            user: {
                id: profile.id,
                displayName: profile.displayName
            },
            accessibleResources: resources,
        });

        return done(null, profile.id);
    }

    private verifyJira(accessToken: string, refreshToken: string, profile: any, done: any): void {
        return this.verify(OAuthProvider.JiraCloud, accessToken, refreshToken, profile, done);
    }

    private verifyJiraStaging(accessToken: string, refreshToken: string, profile: any, done: any): void {
        return this.verify(OAuthProvider.JiraCloudStaging, accessToken, refreshToken, profile, done);
    }

    private verifyBitbucket(accessToken: string, refreshToken: string, profile: any, done: any): void {
        profile.accessibleResources = [{
            id: OAuthProvider.BitbucketCloud,
            name: ProductBitbucket.name,
            scopes: [],
            avatarUrl: "",
            baseUrlSuffix: "bitbucket.org"
        }];

        return this.verify(OAuthProvider.BitbucketCloud, accessToken, refreshToken, profile, done);
    }

    private verifyBitbucketStaging(accessToken: string, refreshToken: string, profile: any, done: any): void {
        profile.accessibleResources = [{
            id: OAuthProvider.BitbucketCloudStaging,
            name: ProductBitbucket.name,
            scopes: [],
            avatarUrl: "",
            baseUrlSuffix: "bb-inf.net"
        }];

        return this.verify(OAuthProvider.BitbucketCloudStaging, accessToken, refreshToken, profile, done);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async doDance(provider: OAuthProvider): Promise<OAuthResponse> {
        if (this._authsInFlight.includes(provider)) {
            this.shutdown(provider);
            await this.sleep(1 * Time.SECONDS);
        }

        this._authsInFlight.push(provider);

        if (!this._srv) {
            this._srv = http.createServer(this._app).listen(31415, () => console.log('server started on port 31415'));
        }

        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`http://127.0.0.1:31415/auth/${provider}`));
        this.startTimeoutTimer(provider);

        return new Promise<OAuthResponse>((resolve, reject) => {
            const myProvider = provider;

            const checkId = setInterval(() => {

                let authInfo = this._authInfo.get(myProvider);
                let authError = this._authErrors.get(myProvider);

                if (!authInfo && !authError && !this._authsInFlight.includes(myProvider)) {
                    clearInterval(checkId);
                    reject({ cancelled: true, message: `Authentication for ${myProvider} has been cancelled.` });
                    return;
                }

                if (authInfo) {
                    clearInterval(checkId);
                    this._authInfo.delete(myProvider);
                    resolve(authInfo);
                    return;
                }

                if (authError) {
                    clearInterval(checkId);
                    this._authErrors.delete(myProvider);
                    reject(authError);
                    return;
                }

            }, 1 * Time.SECONDS);

        });
    }

    private shutdown(provider: OAuthProvider) {
        let myIndex = this._authsInFlight.indexOf(provider);
        if (myIndex > -1) {
            this._authsInFlight.splice(myIndex, 1);
        }

        const timer = this._timeoutTimers.get(provider);
        if (timer) {
            clearTimeout(timer);
            this._timeoutTimers.delete(provider);
        }

        if (this._srv && this._authsInFlight.length < 1) {
            this._srv.close();
            this._srv = undefined;
            console.log('server on port 31415 has been shutdown');
        }
    }

    private forceShutdownAll() {
        this._authsInFlight.forEach(provider => {
            const timer = this._timeoutTimers.get(provider);
            if (timer) {
                clearTimeout(timer);
                this._timeoutTimers.delete(provider);
            }
        });

        this._authsInFlight = [];

        if (this._srv) {
            this._srv.close();
            this._srv = undefined;
            console.log('server on port 31415 has been shutdown');
        }
    }

    private startTimeoutTimer(provider: OAuthProvider) {
        //make sure we clear the old one in case they click multiple times
        const oldTimer = this._timeoutTimers.get(provider);
        if (oldTimer) {
            clearTimeout(oldTimer);
            this._timeoutTimers.delete(provider);
        }

        this._timeoutTimers.set(provider, setTimeout(() => {
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`http://127.0.0.1:31415/timeout?provider=${provider}`));
        }, this._browserTimeout));
    }

    public async getNewAccessToken(provider: OAuthProvider, refreshToken: string): Promise<string | undefined> {
        return new Promise<string>((resolve, reject) => {
            refresh.requestNewAccessToken(provider, refreshToken, (err: Error, accessToken: string, newRefreshToken: string) => {
                if (err) {
                    Logger.error(err, "refresh error");
                    reject(undefined);
                }
                if (accessToken && accessToken !== '') {
                    resolve(accessToken);
                } else {
                    // the refresh token may have been revoked, in which case BB returns valid token info with the access token removed instead of an error.
                    reject(undefined);
                }
            });
        });
    }
}
