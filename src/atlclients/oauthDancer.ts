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
import { ProductBitbucket, ProductJira } from '../constants';
import { Time } from '../util/time';

export class OAuthDancer {
    private _srv: http.Server | undefined;
    public _authInfo: authinfo.AuthInfo | undefined;
    private _timer:any;
    private _browserTimeout =  1 * Time.MINUTES;

    private _bbCloudStrategy = new BitbucketStrategy.Strategy({
        clientID: "3hasX42a7Ugka2FJja",
        clientSecret: "st7a4WtBYVh7L2mZMU8V5ehDtvQcWs9S",
        callbackURL: "http://127.0.0.1:9090/" + authinfo.AuthProvider.BitbucketCloud
    }, this.verify.bind(this));

    private _jiraCloudStrategy = new AtlassianStrategy({
        clientID: 'bJChVgBQd0aNUPuFZ8YzYBVZz3X4QTe2',
        clientSecret: 'P0sl4EwwnXUHZoZgMLi2G6jzeCS1rRI8-w8X0kPf6A1XXQRC5_-F252BhbxgeI3b',
        callbackURL: 'http://127.0.0.1:9090/' + authinfo.AuthProvider.JiraCloud,
        scope: 'read:jira-user read:jira-work write:jira-work offline_access',
    }, this.verify.bind(this));

    public constructor() {
        passport.serializeUser(function (user, done) {
            done(null, user);
        });

        passport.deserializeUser(function (obj, done) {
            done(null, obj);
        });

        passport.use(authinfo.AuthProvider.BitbucketCloud, this._bbCloudStrategy);
        passport.use(authinfo.AuthProvider.JiraCloud, this._jiraCloudStrategy);
        refresh.use(authinfo.AuthProvider.BitbucketCloud, this._bbCloudStrategy);
        refresh.use(authinfo.AuthProvider.JiraCloud, this._jiraCloudStrategy);
    }

    private verify(accessToken: string, refreshToken: string, profile: any, done: any): void {
        let resources: authinfo.AccessibleResource[] = [];

        if (profile.accessibleResources) {
            Logger.debug("got resources");
            profile.accessibleResources.forEach((resource: authinfo.AccessibleResource) => {
                resources.push(resource);
            });
        }

        let provider = profile.provider === 'atlassian' ? authinfo.AuthProvider.JiraCloud : authinfo.AuthProvider.BitbucketCloud;

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

        Logger.debug("profile:\n" + JSON.stringify(profile, null, 2));
        Logger.debug("authInfo:\n" + JSON.stringify(this._authInfo, null, 2));

        return done(null, profile.id);
    }

    public async doDance(provider: string): Promise<authinfo.AuthInfo> {
        Logger.debug("doing dance...");

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

            _app.get('/auth/' + authinfo.AuthProvider.JiraCloud,
                passport.authenticate(authinfo.AuthProvider.JiraCloud),
                function (req, res) {
                    // The request will be redirected to Bitbucket for authentication, so this
                    // function will not be called.
                });

            _app.get('/' + authinfo.AuthProvider.BitbucketCloud, passport.authenticate(authinfo.AuthProvider.BitbucketCloud, { failureRedirect: '/error' }), (req, res) => {
                Logger.debug("got bb callback");
                res.send(Resources.html.get('authSuccessHtml')!({
                    product: ProductBitbucket
                }));
                this.shutdown()
                resolve(this._authInfo);
            });

            _app.get('/' + authinfo.AuthProvider.JiraCloud, passport.authenticate(authinfo.AuthProvider.JiraCloud, { failureRedirect: '/error' }), (req, res) => {
                Logger.debug("got jira callback");
                res.send(Resources.html.get('authSuccessHtml')!({
                    product: ProductJira
                }));
                this.shutdown();
                resolve(this._authInfo);
            });

            _app.get('/error', (req, res) => {
                Logger.debug("got jira error");
                res.send(Resources.html.get('authFailureHtml')!({}));
                this.shutdown();
                resolve(this._authInfo);
            });

            _app.get('/timeout', (req, res) => {
                Logger.debug("oauth timed out");
                res.send(Resources.html.get('authTimeoutHtml')!({}));
                this.shutdown();
                reject("authentication timed out");
            });

            Logger.debug("building callback server");

            this._srv = _app.listen(9090, () => console.log('server started on port 9090'));

            Logger.debug("authenticating...");
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`http://127.0.0.1:9090/auth/${provider}`));
            this.startTimer();
        });
    }

    private shutdown() {

        if (this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }

        if (this._srv) {
            this._srv.close();
            this._srv = undefined;
        }
    }

    private startTimer() {
        //make sure we clear the old one in case they click multiple times
        if(this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
        
        this._timer = setInterval(() => {
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