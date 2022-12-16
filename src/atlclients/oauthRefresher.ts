import { OAuthProvider, ProductBitbucket, ProductJira } from './authInfo';
import { Tokens, tokensFromResponseData } from './tokens';
import axios, { AxiosInstance } from 'axios';

import { AxiosUserAgent } from '../constants';
import { ConnectionTimeout } from '../util/time';
import { Container } from '../container';
import { Disposable } from 'vscode';
import { Logger } from 'src/logger';
import { addCurlLogging } from './interceptors';
import { getAgent } from '../jira/jira-client/providers';
import { strategyForProvider } from './oldStrategy';

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
        Logger.debug(`Starting token refresh`);
        const product = provider.startsWith('jira') ? ProductJira : ProductBitbucket;

        const strategy = strategyForProvider(provider);
        const tokenResponse = await this._axios(strategy.tokenUrl(), {
            method: 'POST',
            headers: strategy.refreshHeaders(),
            data: strategy.tokenRefreshData(refreshToken),
            ...getAgent(),
        });

        if (product === ProductJira) {
            const tokens = tokensFromResponseData(tokenResponse.data);
            Logger.debug(`have new tokens`);
            return tokens;
        } else {
            const data = tokenResponse.data;

            const tokens = {
                accessToken: data.access_token,
                receivedAt: Date.now(),
            };

            if (data.expires_in) {
                tokens['expiration'] = Date.now() + data.expires_in * 1000;
            }

            return tokens;
        }
    }
}
