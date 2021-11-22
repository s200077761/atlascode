import axios, { AxiosInstance } from 'axios';
import { Disposable } from 'vscode';
import { configuration } from '../config/configuration';
import { AxiosUserAgent } from '../constants';
import { Container } from '../container';
import { getAgent } from '../jira/jira-client/providers';
import { ConnectionTimeout } from '../util/time';
import { OAuthProvider, ProductBitbucket, ProductJira } from './authInfo';
import { addCurlLogging } from './interceptors';
import {
    JiraProdStrategy as OldJiraProdStrategy,
    BitbucketProdStrategy as OldBitbucketProdStrategy,
    BitbucketStagingStrategy as OldBitbucketStagingStrategy,
    JiraStagingStrategy as OldJiraStagingStrategy,
} from './oldStrategy';
import { BitbucketProdStrategy, BitbucketStagingStrategy, JiraProdStrategy, JiraStagingStrategy } from './strategy';
import { Tokens } from './oauthDancer';
import { Logger } from 'src/logger';
import jwtDecode from 'jwt-decode';
export class OAuthRefesher implements Disposable {
    private _axios: AxiosInstance;

    constructor() {
        this._axios = axios.create({
            timeout: ConnectionTimeout,
            headers: {
                'User-Agent': AxiosUserAgent,
                'Accept-Encoding': 'gzip, deflate',
            },
        });
        if (Container.config.enableCurlLogging) {
            addCurlLogging(this._axios);
        }
    }

    dispose() {}

    public async getNewTokens(provider: OAuthProvider, refreshToken: string): Promise<Tokens | undefined> {
        const product = provider.startsWith('jira') ? ProductJira : ProductBitbucket;

        if (product === ProductJira) {
            let strategy: any = undefined;
            let dataString = '';
            if (configuration.get<boolean>('useNewAuth')) {
                strategy = provider.endsWith('staging') ? JiraStagingStrategy : JiraProdStrategy;
                dataString = JSON.stringify({
                    grant_type: 'refresh_token',
                    client_id: strategy.clientID,
                    refresh_token: refreshToken,
                });
            } else {
                strategy = provider.endsWith('staging') ? OldJiraStagingStrategy : OldJiraProdStrategy;
                dataString = JSON.stringify({
                    grant_type: 'refresh_token',
                    client_id: strategy.clientID,
                    client_secret: strategy.clientSecret,
                    refresh_token: refreshToken,
                    redirect_uri: strategy.callbackURL,
                });
            }
            const tokenResponse = await this._axios(strategy.tokenURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: dataString,
                ...getAgent(),
            });

            const data = tokenResponse.data;
            const token = data.access_token;
            const decodedToken: any = jwtDecode(token);
            const iat = decodedToken ? (decodedToken.iat ? decodedToken.iat * 1000 : 0) : 0;
            const expiresIn = data.expires_in;
            const expiration = Date.now() + expiresIn * 1000;
            Logger.debug(`AccessToken created at ${decodedToken.iat}`);
            return {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiration: expiration,
                iat: iat,
                receivedAt: Date.now(),
            };
        } else {
            let strategy: any = undefined;
            if (configuration.get<boolean>('useNewAuth')) {
                strategy = provider.endsWith('staging') ? BitbucketStagingStrategy : BitbucketProdStrategy;
            } else {
                strategy = provider.endsWith('staging') ? OldBitbucketStagingStrategy : OldBitbucketProdStrategy;
            }
            const basicAuth = Buffer.from(`${strategy.clientID}:${strategy.clientSecret}`).toString('base64');

            const tokenResponse = await this._axios(strategy.tokenURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${basicAuth}`,
                },
                data: `grant_type=refresh_token&refresh_token=${refreshToken}`,
                ...getAgent(),
            });

            const data = tokenResponse.data;
            return { accessToken: data.access_token, receivedAt: Date.now() };
        }
    }
}
