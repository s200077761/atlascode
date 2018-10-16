import * as vscode from 'vscode';
import * as BitbucketStrategy from 'passport-bitbucket-oauth2';
const AtlassianStrategy = require('passport-atlassian-oauth2');
import * as refresh from 'passport-oauth2-refresh';
import { Logger } from '../logger';
import * as express from 'express';
import * as passport from 'passport';
import * as http from 'http';
import * as authinfo from './authInfo';

export class OAuthDancer {
    private _srv: http.Server | undefined;
    public _authInfo: authinfo.AuthInfo | undefined;

    private _bbCloudStrategy = new BitbucketStrategy.Strategy({
        clientID: "DQhnLnWwACPXJXW2qX",
        clientSecret: "uwACseDkGP4hc7JvWHAatZZruHzYpLMH",
        callbackURL: "http://127.0.0.1:9090/" + authinfo.AuthProvider.BitbucketCloud
      },this.verify.bind(this));

      private _jiraCloudStrategy = new AtlassianStrategy({
        clientID: 'PNchU3mOSFLJt1qp3HUDOEUL231OX6lu',
        clientSecret: '9DObTr9hl8OEZ9sMlQ4TlFbWm6ijKeHDA9PXf4jM5LoLhyIu5oQR7Xppo_Yq2pye',
        callbackURL: 'http://127.0.0.1:9090/' + authinfo.AuthProvider.JiraCloud,
        scope: 'read:jira-user read:jira-work write:jira-work offline_access',
      }, this.verify.bind(this));

    public constructor() {
        passport.serializeUser(function(user, done) {
            done(null, user);
        });
        
        passport.deserializeUser(function(obj, done) {
            done(null, obj);
        });

         passport.use(authinfo.AuthProvider.BitbucketCloud, this._bbCloudStrategy);
         passport.use(authinfo.AuthProvider.JiraCloud, this._jiraCloudStrategy);
         refresh.use(this._bbCloudStrategy);
         refresh.use(this._jiraCloudStrategy);
    }

    private verify(accessToken: string, refreshToken: string, profile: any, done: any):void {
        let resources:authinfo.AccessibleResource[] = [];

        if (profile.accessibleResources) {
            Logger.debug("got resources");
            profile.accessibleResources.forEach( (resource:authinfo.AccessibleResource) => {
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

    public async doDance(provider:string): Promise<authinfo.AuthInfo> {
        Logger.debug("doing dance...");

        return new Promise<authinfo.AuthInfo>((resolve, reject) => {
            let _app = express();
            _app.use(passport.initialize());
            _app.use(passport.session());

            _app.get('/auth/' + authinfo.AuthProvider.BitbucketCloud,
                passport.authenticate(authinfo.AuthProvider.BitbucketCloud),
                function(req, res){
                // The request will be redirected to Bitbucket for authentication, so this
                // function will not be called.
            });

            _app.get('/auth/' + authinfo.AuthProvider.JiraCloud,
                passport.authenticate(authinfo.AuthProvider.JiraCloud),
                function(req, res){
                // The request will be redirected to Bitbucket for authentication, so this
                // function will not be called.
            });

            _app.get('/' + authinfo.AuthProvider.BitbucketCloud, passport.authenticate(authinfo.AuthProvider.BitbucketCloud, { failureRedirect: '/error' }), (req, res) => {
                Logger.debug("got bb callback");
                res.send('We\'re done here.');
                if (this._srv) {
                    this._srv.close();
                    this._srv = undefined;
                }
                resolve(this._authInfo);
            });

            _app.get('/' + authinfo.AuthProvider.JiraCloud, passport.authenticate(authinfo.AuthProvider.JiraCloud, { failureRedirect: '/error' }), (req, res) => {
                Logger.debug("got jira callback");
                res.send('We\'re done here.');
                if (this._srv) {
                    this._srv.close();
                    this._srv = undefined;
                }
                resolve(this._authInfo);
            });

            _app.get('/error', (req, res) => {
                Logger.debug("got jira error");
                res.send('We\'re done here.');
                if (this._srv) {
                    this._srv.close();
                    this._srv = undefined;
                }
                resolve(this._authInfo);
            });

            Logger.debug("building callback server");
            
            this._srv = _app.listen(9090, () => console.log('server started on port 9090'));
            
            Logger.debug("authenticating...");
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`http://127.0.0.1:9090/auth/${provider}`));
        });
    }

    public async refresh(authInfo:authinfo.AuthInfo): Promise<authinfo.AuthInfo> {
        return new Promise<authinfo.AuthInfo>((resolve, reject) => {
            refresh.requestNewAccessToken(authInfo.user.provider,authInfo.refresh,(err:Error,accessToken:string,refreshToken:string) => {
                let newAuth:authinfo.AuthInfo = authInfo;
                newAuth.access = accessToken;

                resolve(newAuth);
            });
        });
    }
}