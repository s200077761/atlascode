import axios, { AxiosInstance } from 'axios';
import { Disposable } from 'vscode';
import { Container } from '../container';
import { getAgent } from '../jira/jira-client/providers';
import { ConnectionTimeout } from '../util/time';
import { OAuthProvider, ProductBitbucket, ProductJira } from './authInfo';
import { addCurlLogging } from './interceptors';
import { BitbucketProdStrategy, BitbucketStagingStrategy, JiraProdStrategy, JiraStagingStrategy } from './strategy';
export class OAuthRefesher implements Disposable {
    private _axios: AxiosInstance;

    constructor() {
        this._axios = axios.create({
            timeout: ConnectionTimeout,
            headers: {
                'User-Agent': 'atlascode/2.x',
                'Accept-Encoding': 'gzip, deflate',
            },
        });
        if (Container.config.enableCurlLogging) {
            addCurlLogging(this._axios);
        }
    }

    dispose() {}

    public async getNewAccessToken(provider: OAuthProvider, refreshToken: string): Promise<string | undefined> {
        const product = provider.startsWith('jira') ? ProductJira : ProductBitbucket;

        if (product === ProductJira) {
            const strategy = provider.endsWith('staging') ? JiraStagingStrategy : JiraProdStrategy;
            const tokenResponse = await this._axios(strategy.tokenURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    grant_type: 'refresh_token',
                    client_id: strategy.clientID,
                    client_secret: strategy.clientSecret,
                    refresh_token: refreshToken,
                    redirect_uri: strategy.callbackURL,
                }),
                ...getAgent(),
            });

            const data = tokenResponse.data;
            return data.access_token;
        } else {
            const strategy = provider.endsWith('staging') ? BitbucketStagingStrategy : BitbucketProdStrategy;
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
            return data.access_token;
        }
    }
}
