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
    public _authInfo: authinfo.AuthInfo | undefined;
    private _timer: any;
    private _browserTimeout = 5 * Time.MINUTES;

    private _bbCloudStrategy = new BitbucketStrategy.Strategy({
        clientID: "3hasX42a7Ugka2FJja",
        clientSecret: "st7a4WtBYVh7L2mZMU8V5ehDtvQcWs9S",
        callbackURL: "http://127.0.0.1:9090/" + authinfo.AuthProvider.BitbucketCloud
    }, this.verify.bind(this));

    private _bbCloudStrategyStaging = new BitbucketStrategy.Strategy({
        clientID: "7jspxC7fgemuUbnWQL",
        clientSecret: "sjHugFh6SVVshhVE7PUW3bgXbbQDVjJD",
        callbackURL: "http://127.0.0.1:9090/" + authinfo.AuthProvider.BitbucketCloudStaging,
        authorizationURL: "https://staging.bb-inf.net/site/oauth2/authorize",
        tokenURL: "https://staging.bb-inf.net/site/oauth2/access_token",
        userProfileURL: "https://api-staging.bb-inf.net/2.0/user"
    }, this.verify.bind(this));

    private _jiraCloudStrategy = new AtlassianStrategy({
        clientID: 'bJChVgBQd0aNUPuFZ8YzYBVZz3X4QTe2',
        clientSecret: 'P0sl4EwwnXUHZoZgMLi2G6jzeCS1rRI8-w8X0kPf6A1XXQRC5_-F252BhbxgeI3b',
        callbackURL: 'http://127.0.0.1:9090/' + authinfo.AuthProvider.JiraCloud,
        scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
    }, this.verify.bind(this));

    private _jiraCloudStrategyStaging = new AtlassianStrategy({
        clientID: 'g3GXn3bTbZeAtn5KptcN1WmF281f0qd3',
        clientSecret: 'H-I5Fp6UQ9FlCfA6IuWzA1lJgRJaekyqB9QF6hc2h_53liCfTNpbcMJIt24MkHw6',
        authorizationURL: "https://auth.stg.atlassian.com/authorize",
        tokenURL: "https://auth.stg.atlassian.com/oauth/token",
        profileURL: "https://api.stg.atlassian.com/me",
        accessibleResourcesURL: 'https://api.stg.atlassian.com/oauth/token/accessible-resources',
        callbackURL: 'http://127.0.0.1:9090/' + authinfo.AuthProvider.JiraCloudStaging,
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

        this._authInfo = {
            access: accessToken,
            refresh: refreshToken,
            user: {
                id: profile.id,
                displayName: profile.displayName,
                provider: provider
            },
            accessibleResources: resources
        };

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

        this._authInfo = {
            access: accessToken,
            refresh: refreshToken,
            user: {
                id: profile.id,
                displayName: profile.displayName,
                provider: authinfo.AuthProvider.JiraCloudStaging
            },
            accessibleResources: resources
        };

        return done(null, profile.id);
    }

    public async doDance(provider: string): Promise<authinfo.AuthInfo> {

        return new Promise<authinfo.AuthInfo>((resolve, reject) => {
            let _app = express();
            _app.use(passport.initialize());
            _app.use(passport.session());

            _app.get('/auth/' + authinfo.AuthProvider.BitbucketCloud,
                passport.authenticate(authinfo.AuthProvider.BitbucketCloud),
                function (req, res) {
                    // The request will be redirected to Bitbucket for authentication, so this
                    // function will not be called.
                });

            _app.get('/auth/' + authinfo.AuthProvider.BitbucketCloudStaging,
                passport.authenticate(authinfo.AuthProvider.BitbucketCloudStaging),
                function (req, res) {
                    // The request will be redirected to Bitbucket for authentication, so this
                    // function will not be called.
                });

            _app.get('/auth/' + authinfo.AuthProvider.JiraCloud,
                passport.authenticate(authinfo.AuthProvider.JiraCloud),
                function (req, res) {
                    // The request will be redirected to Bitbucket for authentication, so this
                    // function will not be called.
                });

            _app.get('/auth/' + authinfo.AuthProvider.JiraCloudStaging,
                passport.authenticate(authinfo.AuthProvider.JiraCloudStaging),
                function (req, res) {
                    // The request will be redirected to Bitbucket for authentication, so this
                    // function will not be called.
                });

            _app.get('/' + authinfo.AuthProvider.BitbucketCloud, passport.authenticate(authinfo.AuthProvider.BitbucketCloud, { failureRedirect: '/error' }), (req, res) => {
                res.send(Resources.html.get('authSuccessHtml')!({
                    product: ProductBitbucket,
                    vscodeurl: vscodeurl
                }));
                this.shutdown();
                resolve(this._authInfo);
            });

            _app.get('/' + authinfo.AuthProvider.BitbucketCloudStaging, passport.authenticate(authinfo.AuthProvider.BitbucketCloudStaging, { failureRedirect: '/error' }), (req, res) => {
                res.send(Resources.html.get('authSuccessHtml')!({
                    product: ProductBitbucket,
                    vscodeurl: vscodeurl
                }));
                this.shutdown();
                resolve(this._authInfo);
            });

            _app.get('/' + authinfo.AuthProvider.JiraCloud, passport.authenticate(authinfo.AuthProvider.JiraCloud, { failureRedirect: '/error' }), (req, res) => {
                res.send(Resources.html.get('authSuccessHtml')!({
                    product: ProductJira,
                    vscodeurl: vscodeurl
                }));
                this.shutdown();
                resolve(this._authInfo);
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`vscode://`));
            });

            _app.get('/' + authinfo.AuthProvider.JiraCloudStaging, passport.authenticate(authinfo.AuthProvider.JiraCloudStaging, { failureRedirect: '/error' }), (req, res) => {
                res.send(Resources.html.get('authSuccessHtml')!({
                    product: ProductJira,
                    vscodeurl: vscodeurl
                }));
                this.shutdown();
                resolve(this._authInfo);
                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`vscode://`));
            });

            _app.get('/error', (req, res) => {
                Logger.debug("got jira error", req.query);
                res.send(Resources.html.get('authFailureHtml')!({
                    errMessage: "We weren't able to authorize your account.",
                    actionMessage: 'Give it a moment and try again.',
                    vscodeurl: vscodeurl
                }));
                this.shutdown();
                resolve(this._authInfo);
            });

            _app.get('/timeout', (req, res) => {
                Logger.debug("oauth timed out");
                res.send(Resources.html.get('authFailureHtml')!({
                    errMessage: 'Authorization did not complete in the time alotted.',
                    actionMessage: 'Please try again.',
                    vscodeurl: vscodeurl
                }));
                this.shutdown();
                reject("authentication timed out");
            });

            this._srv = http.createServer(_app).listen(9090, () => console.log('server started on port 9090'));
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`http://127.0.0.1:9090/auth/${provider}`));
            this.startTimer();
        });
    }

    private shutdown() {

        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }

        if (this._srv) {
            this._srv.close();
            this._srv = undefined;
        }
    }

    private startTimer() {
        //make sure we clear the old one in case they click multiple times
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }

        this._timer = setTimeout(() => {
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`http://127.0.0.1:9090/timeout`));
        }, this._browserTimeout);
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