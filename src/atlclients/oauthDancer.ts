import * as vscode from 'vscode';
const BitbucketStrategy = require('passport-bitbucket-oauth2');
const AtlassianStrategy = require('passport-atlassian-oauth2');
import * as refresh from 'passport-oauth2-refresh';
import { Logger } from '../logger';
import * as express from 'express';
import * as passport from 'passport';
import * as http from 'http';
import * as authinfo from './authInfo';
import { Resources } from '../resources';
import { Time } from '../util/time';
import { ProductBitbucket, ProductJira } from './authInfo';

const vscodeurl = vscode.version.endsWith('-insider') ? 'vscode-insiders://file' : 'vscode://file';

export class OAuthDancer {
    private _srv: http.Server | undefined;
    private _app: any;
    private _authInfo: Map<string, authinfo.AuthInfo> = new Map();
    private _authErrors: Map<string, string> = new Map();
    private _authsInFlight: string[] = [];
    private _timeoutTimers: Map<string, any> = new Map();
    private _browserTimeout = 5 * Time.MINUTES;

    private _bbCloudStrategy = new BitbucketStrategy.Strategy({
        clientID: "3hasX42a7Ugka2FJja",
        clientSecret: "st7a4WtBYVh7L2mZMU8V5ehDtvQcWs9S",
        callbackURL: "http://127.0.0.1:31415/" + authinfo.AuthProvider.BitbucketCloud
    }, this.verify.bind(this));

    private _bbCloudStrategyStaging = new BitbucketStrategy.Strategy({
        clientID: "7jspxC7fgemuUbnWQL",
        clientSecret: "sjHugFh6SVVshhVE7PUW3bgXbbQDVjJD",
        callbackURL: "http://127.0.0.1:31415/" + authinfo.AuthProvider.BitbucketCloudStaging,
        authorizationURL: "https://staging.bb-inf.net/site/oauth2/authorize",
        tokenURL: "https://staging.bb-inf.net/site/oauth2/access_token",
        userProfileURL: "https://api-staging.bb-inf.net/2.0/user"
    }, this.verify.bind(this));

    private _jiraCloudStrategy = new AtlassianStrategy({
        clientID: 'bJChVgBQd0aNUPuFZ8YzYBVZz3X4QTe2',
        clientSecret: 'P0sl4EwwnXUHZoZgMLi2G6jzeCS1rRI8-w8X0kPf6A1XXQRC5_-F252BhbxgeI3b',
        callbackURL: 'http://127.0.0.1:31415/' + authinfo.AuthProvider.JiraCloud,
        scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
    }, this.verify.bind(this));

    private _jiraCloudStrategyStaging = new AtlassianStrategy({
        clientID: 'pmzXmUav3Rr5XEL0Sie7Biec0WGU8BKg',
        clientSecret: 'u8PPS8h23z5575nWvy5fsI77J1UBw1J-IlvTgfZXV9mibpXsQF9aJcbYf7e8yeSu',
        authorizationURL: "https://auth.stg.atlassian.com/authorize",
        tokenURL: "https://auth.stg.atlassian.com/oauth/token",
        profileURL: "https://api.stg.atlassian.com/me",
        accessibleResourcesURL: 'https://api.stg.atlassian.com/oauth/token/accessible-resources',
        callbackURL: 'http://127.0.0.1:31415/' + authinfo.AuthProvider.JiraCloudStaging,
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

        passport.use(authinfo.AuthProvider.BitbucketCloud, this._bbCloudStrategy);
        passport.use(authinfo.AuthProvider.BitbucketCloudStaging, this._bbCloudStrategyStaging);
        passport.use(authinfo.AuthProvider.JiraCloud, this._jiraCloudStrategy);
        passport.use(authinfo.AuthProvider.JiraCloudStaging, this._jiraCloudStrategyStaging);
        refresh.use(authinfo.AuthProvider.BitbucketCloud, this._bbCloudStrategy);
        refresh.use(authinfo.AuthProvider.BitbucketCloudStaging, this._bbCloudStrategyStaging);
        refresh.use(authinfo.AuthProvider.JiraCloud, this._jiraCloudStrategy);
        refresh.use(authinfo.AuthProvider.JiraCloudStaging, this._jiraCloudStrategyStaging);

        this._app = this.createApp();
    }

    private createApp(): any {
        let app = express();
        app.use(passport.initialize());
        app.use(passport.session());

        app.get('/auth/' + authinfo.AuthProvider.BitbucketCloud,
            passport.authenticate(authinfo.AuthProvider.BitbucketCloud),
            function (req, res) {
                // The request will be redirected to Bitbucket for authentication, so this
                // function will not be called.
            });

        app.get('/auth/' + authinfo.AuthProvider.BitbucketCloudStaging,
            passport.authenticate(authinfo.AuthProvider.BitbucketCloudStaging),
            function (req, res) {
                // The request will be redirected to Bitbucket for authentication, so this
                // function will not be called.
            });

        app.get('/auth/' + authinfo.AuthProvider.JiraCloud,
            passport.authenticate(authinfo.AuthProvider.JiraCloud),
            function (req, res) {
                // The request will be redirected to Bitbucket for authentication, so this
                // function will not be called.
            });

        app.get('/auth/' + authinfo.AuthProvider.JiraCloudStaging,
            passport.authenticate(authinfo.AuthProvider.JiraCloudStaging),
            function (req, res) {
                // The request will be redirected to Bitbucket for authentication, so this
                // function will not be called.
            });

        app.get('/' + authinfo.AuthProvider.BitbucketCloud, passport.authenticate(authinfo.AuthProvider.BitbucketCloud, { failureRedirect: '/error' }), (req, res) => {

            res.send(Resources.html.get('authSuccessHtml')!({
                product: ProductBitbucket,
                vscodeurl: vscodeurl
            }));
            this.shutdown(authinfo.AuthProvider.BitbucketCloud);
        });

        app.get('/' + authinfo.AuthProvider.BitbucketCloudStaging, passport.authenticate(authinfo.AuthProvider.BitbucketCloudStaging, { failureRedirect: '/error' }), (req, res) => {

            res.send(Resources.html.get('authSuccessHtml')!({
                product: ProductBitbucket,
                vscodeurl: vscodeurl
            }));
            this.shutdown(authinfo.AuthProvider.BitbucketCloudStaging);
        });

        app.get('/' + authinfo.AuthProvider.JiraCloud, passport.authenticate(authinfo.AuthProvider.JiraCloud, { failureRedirect: '/error' }), (req, res) => {

            res.send(Resources.html.get('authSuccessHtml')!({
                product: ProductJira,
                vscodeurl: vscodeurl
            }));
            this.shutdown(authinfo.AuthProvider.JiraCloud);
        });

        app.get('/' + authinfo.AuthProvider.JiraCloudStaging, passport.authenticate(authinfo.AuthProvider.JiraCloudStaging, { failureRedirect: '/error' }), (req, res) => {

            res.send(Resources.html.get('authSuccessHtml')!({
                product: ProductJira,
                vscodeurl: vscodeurl
            }));
            this.shutdown(authinfo.AuthProvider.JiraCloudStaging);

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

    private verify(accessToken: string, refreshToken: string, profile: any, done: any): void {
        let resources: authinfo.AccessibleResource[] = [];

        const isBitbucketStaging: boolean = (profile.profileUrl && profile.profileUrl.indexOf('bb-inf.net') !== -1) ? true : false;

        if (profile.accessibleResources) {
            profile.accessibleResources.forEach((resource: authinfo.AccessibleResource) => {
                resources.push(resource);
            });
        }

        let provider = profile.provider === 'atlassian' ? authinfo.AuthProvider.JiraCloud : authinfo.AuthProvider.BitbucketCloud;
        if (isBitbucketStaging) {
            provider = authinfo.AuthProvider.BitbucketCloudStaging;
        }

        this._authInfo.set(provider, {
            access: accessToken,
            refresh: refreshToken,
            user: {
                id: profile.id,
                displayName: profile.displayName,
                provider: provider
            },
            accessibleResources: resources
        });

        return done(null, profile.id);
    }

    private verifyJiraStaging(accessToken: string, refreshToken: string, profile: any, done: any): void {
        let resources: authinfo.AccessibleResource[] = [];
        if (profile.accessibleResources) {
            profile.accessibleResources.forEach((resource: authinfo.AccessibleResource) => {
                let newresource = resource;
                newresource.baseUrlSuffix = 'jira-dev.com';
                resources.push(newresource);
            });
        }

        this._authInfo.set(authinfo.AuthProvider.JiraCloudStaging, {
            access: accessToken,
            refresh: refreshToken,
            user: {
                id: profile.id,
                displayName: profile.displayName,
                provider: authinfo.AuthProvider.JiraCloudStaging
            },
            accessibleResources: resources
        });

        return done(null, profile.id);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async doDance(provider: string): Promise<authinfo.AuthInfo> {
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

        return new Promise<authinfo.AuthInfo>((resolve, reject) => {
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

    private shutdown(provider: string) {
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

    private startTimeoutTimer(provider: string) {
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

    public async refresh(authInfo: authinfo.AuthInfo): Promise<authinfo.AuthInfo> {
        return new Promise<authinfo.AuthInfo>((resolve, reject) => {
            refresh.requestNewAccessToken(authInfo.user.provider, authInfo.refresh, (err: Error, accessToken: string, refreshToken: string) => {
                if (err) {
                    Logger.debug("refresh error: " + err);
                }
                let newAuth: authinfo.AuthInfo = authInfo;
                newAuth.access = accessToken;

                if (newAuth.access && newAuth.access !== '') {
                    resolve(newAuth);
                } else {
                    // the refresh token may have been revoked, in which case BB returns valid token info with the access token removed instead of an error.
                    reject("invalid refresh token");
                }
            });
        });
    }
}
