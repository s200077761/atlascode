import * as vscode from 'vscode';
const BitbucketStrategy = require('passport-bitbucket-oauth2');
const AtlassianStrategy = require('passport-atlassian-oauth2');
import { Logger } from '../logger';
import * as express from 'express';
import * as passport from 'passport';
import * as http from 'http';
import { Resources } from '../resources';
import { Time } from '../util/time';
import { ProductBitbucket, ProductJira, OAuthProvider, OAuthResponse, AccessibleResource } from './authInfo';
import { Disposable } from 'vscode';
import axios from 'axios';

const vscodeurl = vscode.version.endsWith('-insider') ? 'vscode-insiders://atlassian.atlascode/openSettings' : 'vscode://atlassian.atlascode/openSettings';

export class OAuthDancer implements Disposable {
    private static _instance: OAuthDancer;

    private _srv: http.Server | undefined;
    private _app: any;
    private _authInfo: Map<OAuthProvider, OAuthResponse> = new Map();
    private _authErrors: Map<OAuthProvider, string> = new Map();
    private _authsInFlight: OAuthProvider[] = [];
    private _timeoutTimers: Map<OAuthProvider, any> = new Map();
    private _shutdownCheck: any;
    private _shutdownCheckInterval = 5 * Time.MINUTES;
    private _browserTimeout = 5 * Time.MINUTES;

    private _bbCloudStrategy: any;
    private _bbCloudStrategyStaging: any;
    private _jiraCloudStrategy: any;
    private _jiraCloudStrategyStaging: any;
    //private _myId: number;

    private constructor() {
        //this._myId = Math.random();
        passport.serializeUser(function (user, done) {
            done(null, user);
        });

        passport.deserializeUser(function (obj, done) {
            done(null, obj);
        });

        this._bbCloudStrategy = new BitbucketStrategy.Strategy({
            clientID: "3hasX42a7Ugka2FJja",
            clientSecret: "st7a4WtBYVh7L2mZMU8V5ehDtvQcWs9S",
            callbackURL: "http://127.0.0.1:31415/" + OAuthProvider.BitbucketCloud
        }, this.verifyBitbucket.bind(this));

        this._bbCloudStrategyStaging = new BitbucketStrategy.Strategy({
            clientID: "7jspxC7fgemuUbnWQL",
            clientSecret: "sjHugFh6SVVshhVE7PUW3bgXbbQDVjJD",
            callbackURL: "http://127.0.0.1:31415/" + OAuthProvider.BitbucketCloudStaging,
            authorizationURL: "https://staging.bb-inf.net/site/oauth2/authorize",
            tokenURL: "https://staging.bb-inf.net/site/oauth2/access_token",
            userProfileURL: "https://api-staging.bb-inf.net/2.0/user"
        }, this.verifyBitbucketStaging.bind(this));

        this._jiraCloudStrategy = new AtlassianStrategy({
            clientID: 'bJChVgBQd0aNUPuFZ8YzYBVZz3X4QTe2',
            clientSecret: 'P0sl4EwwnXUHZoZgMLi2G6jzeCS1rRI8-w8X0kPf6A1XXQRC5_-F252BhbxgeI3b',
            callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.JiraCloud,
            scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
        }, this.verifyJira.bind(this));

        this._jiraCloudStrategyStaging = new AtlassianStrategy({
            clientID: 'pmzXmUav3Rr5XEL0Sie7Biec0WGU8BKg',
            clientSecret: 'u8PPS8h23z5575nWvy5fsI77J1UBw1J-IlvTgfZXV9mibpXsQF9aJcbYf7e8yeSu',
            authorizationURL: "https://auth.stg.atlassian.com/authorize",
            tokenURL: "https://auth.stg.atlassian.com/oauth/token",
            profileURL: "https://api.stg.atlassian.com/me",
            accessibleResourcesURL: 'https://api.stg.atlassian.com/oauth/token/accessible-resources',
            callbackURL: 'http://127.0.0.1:31415/' + OAuthProvider.JiraCloudStaging,
            scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
        }, this.verifyJiraStaging.bind(this));

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

        this._app = this.createApp();
    }

    public static get Instance(): OAuthDancer {
        return this._instance || (this._instance = new this());
    }

    dispose() {
        this.forceShutdownAll();
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
            this.clearTimeoutForProvider(OAuthProvider.BitbucketCloud);
        });

        app.get('/' + OAuthProvider.BitbucketCloudStaging, passport.authenticate(OAuthProvider.BitbucketCloudStaging, { failureRedirect: '/error' }), (req, res) => {

            res.send(Resources.html.get('authSuccessHtml')!({
                product: ProductBitbucket,
                vscodeurl: vscodeurl
            }));
            this.clearTimeoutForProvider(OAuthProvider.BitbucketCloudStaging);
        });

        app.get('/' + OAuthProvider.JiraCloud, passport.authenticate(OAuthProvider.JiraCloud, { failureRedirect: '/error' }), (req, res) => {

            res.send(Resources.html.get('authSuccessHtml')!({
                product: ProductJira,
                vscodeurl: vscodeurl
            }));
            this.clearTimeoutForProvider(OAuthProvider.JiraCloud);
        });

        app.get('/' + OAuthProvider.JiraCloudStaging, passport.authenticate(OAuthProvider.JiraCloudStaging, { failureRedirect: '/error' }), (req, res) => {

            res.send(Resources.html.get('authSuccessHtml')!({
                product: ProductJira,
                vscodeurl: vscodeurl
            }));
            this.clearTimeoutForProvider(OAuthProvider.JiraCloudStaging);

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
            this.clearTimeoutForProvider(req.query.provider);
        });

        return app;
    }

    private async verify(provider: OAuthProvider, accessToken: string, refreshToken: string, profile: any, done: any): Promise<void> {
        let resources: AccessibleResource[] = [];

        if (profile.accessibleResources) {
            profile.accessibleResources.forEach((resource: AccessibleResource) => {
                resources.push(resource);
            });
        }
        console.log('got oauth user', profile);
        let user: any = {};
        if (provider === OAuthProvider.JiraCloud || provider === OAuthProvider.JiraCloudStaging) {
            user = {
                id: profile._json.account_id,
                displayName: profile.displayName,
                email: profile.email,
                avatarUrl: profile.photo,
            };
        } else {
            // BB forces you to make a second call to get the email
            let email = 'do-not-reply@atlassian.com';
            const bbclient = axios.create({
                timeout: 10000,
                headers: {
                    'X-Atlassian-Token': 'no-check',
                    'x-atlassian-force-account-id': 'true',
                }
            });
            const url = (provider === OAuthProvider.BitbucketCloud) ? 'https://api.bitbucket.org/2.0/user/emails' : 'https://api-staging.bb-inf.net/2.0/user/emails';

            try {
                const res = await bbclient(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (Array.isArray(res.data.values) && res.data.values.length > 0) {
                    const primary = res.data.values.filter((val: any) => val.is_primary);
                    if (primary.length > 0) {
                        email = primary[0].email;
                    }
                }
            } catch (e) {
                //ignore
            }

            user = {
                id: profile._json.account_id,
                displayName: profile.displayName,
                email: email,
                avatarUrl: profile._json.links.avatar.href,
            };
        }

        this._authInfo.set(provider, {
            access: accessToken,
            refresh: refreshToken,
            user: user,
            accessibleResources: resources,
        });
        return done(null, profile.id);
    }

    private async verifyJira(accessToken: string, refreshToken: string, profile: any, done: any): Promise<void> {
        return await this.verify(OAuthProvider.JiraCloud, accessToken, refreshToken, profile, done);
    }

    private async verifyJiraStaging(accessToken: string, refreshToken: string, profile: any, done: any): Promise<void> {
        return await this.verify(OAuthProvider.JiraCloudStaging, accessToken, refreshToken, profile, done);
    }

    private async verifyBitbucket(accessToken: string, refreshToken: string, profile: any, done: any): Promise<void> {
        profile.accessibleResources = [{
            id: OAuthProvider.BitbucketCloud,
            name: ProductBitbucket.name,
            scopes: [],
            avatarUrl: "",
            url: "https://bitbucket.org"
        }];

        return await this.verify(OAuthProvider.BitbucketCloud, accessToken, refreshToken, profile, done);
    }

    private async verifyBitbucketStaging(accessToken: string, refreshToken: string, profile: any, done: any): Promise<void> {
        profile.accessibleResources = [{
            id: OAuthProvider.BitbucketCloudStaging,
            name: ProductBitbucket.name,
            scopes: [],
            avatarUrl: "",
            url: "https://bb-inf.net"
        }];

        return await this.verify(OAuthProvider.BitbucketCloudStaging, accessToken, refreshToken, profile, done);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async doDance(provider: OAuthProvider): Promise<OAuthResponse> {
        this.clearAuthInFlight(provider);
        await this.sleep(1 * Time.SECONDS);

        this._authsInFlight.push(provider);

        if (!this._srv) {
            this._srv = http.createServer(this._app).listen(31415, () => console.log('server started on port 31415'));
            this.startShutdownChecker();
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

    private clearAuthInFlight(provider: OAuthProvider) {
        let myIndex = this._authsInFlight.indexOf(provider);
        if (myIndex > -1) {
            this._authsInFlight.splice(myIndex, 1);
        }

        const timer = this._timeoutTimers.get(provider);
        if (timer) {
            clearTimeout(timer);
            this._timeoutTimers.delete(provider);
        }
    }

    private clearTimeoutForProvider(provider: OAuthProvider) {
        const timer = this._timeoutTimers.get(provider);
        if (timer) {
            clearTimeout(timer);
            this._timeoutTimers.delete(provider);
        }
    }

    private maybeShutdown() {
        if (this._authsInFlight.length < 1) {

            this._timeoutTimers.forEach((timer: any, key: OAuthProvider) => {
                clearTimeout(timer);
            });

            this._timeoutTimers.clear();

            if (this._shutdownCheck) {
                clearInterval(this._shutdownCheck);
            }

            if (this._srv) {
                this._srv.close();
                this._srv = undefined;
                console.log('server on port 31415 has been shutdown');
            }
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

        if (this._shutdownCheck) {
            clearInterval(this._shutdownCheck);
        }

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

    private startShutdownChecker() {
        //make sure we clear the old one in case they click multiple times
        const oldTimer = this._shutdownCheck;
        if (oldTimer) {
            clearInterval(oldTimer);
        }

        this._shutdownCheck = setInterval(this.maybeShutdown, this._shutdownCheckInterval);
    }
}
