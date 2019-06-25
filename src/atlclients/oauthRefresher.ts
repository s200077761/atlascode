const BitbucketStrategy = require('passport-bitbucket-oauth2');
const AtlassianStrategy = require('passport-atlassian-oauth2');
import * as refresh from 'passport-oauth2-refresh';
import { Logger } from '../logger';
import * as passport from 'passport';
import { Disposable } from 'vscode';
import { OAuthProvider } from './authInfo';

export class OAuthRefesher implements Disposable {
    private _bbCloudStrategy: any;
    private _bbCloudStrategyStaging: any;
    private _jiraCloudStrategy: any;
    private _jiraCloudStrategyStaging: any;

    public constructor() {
        passport.serializeUser(function (user, done) {
            done(null, user);
        });

        passport.deserializeUser(function (obj, done) {
            done(null, obj);
        });

        this._bbCloudStrategy = new BitbucketStrategy.Strategy({
            clientID: "3hasX42a7Ugka2FJja",
            clientSecret: "st7a4WtBYVh7L2mZMU8V5ehDtvQcWs9S"
        }, () => { });

        this._bbCloudStrategyStaging = new BitbucketStrategy.Strategy({
            clientID: "7jspxC7fgemuUbnWQL",
            clientSecret: "sjHugFh6SVVshhVE7PUW3bgXbbQDVjJD",
            tokenURL: "https://staging.bb-inf.net/site/oauth2/access_token"
        }, () => { });

        this._jiraCloudStrategy = new AtlassianStrategy({
            clientID: 'bJChVgBQd0aNUPuFZ8YzYBVZz3X4QTe2',
            clientSecret: 'P0sl4EwwnXUHZoZgMLi2G6jzeCS1rRI8-w8X0kPf6A1XXQRC5_-F252BhbxgeI3b',
            scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
        }, () => { });

        this._jiraCloudStrategyStaging = new AtlassianStrategy({
            clientID: 'pmzXmUav3Rr5XEL0Sie7Biec0WGU8BKg',
            clientSecret: 'u8PPS8h23z5575nWvy5fsI77J1UBw1J-IlvTgfZXV9mibpXsQF9aJcbYf7e8yeSu',
            scope: 'read:jira-user read:jira-work write:jira-work offline_access manage:jira-project',
            tokenURL: "https://auth.stg.atlassian.com/oauth/token",
        }, () => { });

        refresh.use(OAuthProvider.BitbucketCloud, this._bbCloudStrategy);
        refresh.use(OAuthProvider.BitbucketCloudStaging, this._bbCloudStrategyStaging);
        refresh.use(OAuthProvider.JiraCloud, this._jiraCloudStrategy);
        refresh.use(OAuthProvider.JiraCloudStaging, this._jiraCloudStrategyStaging);

    }

    dispose() {

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
