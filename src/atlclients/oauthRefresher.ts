
import { Disposable } from 'vscode';
import { OAuthProvider, ProductJira, ProductBitbucket } from './authInfo';
import axios, { AxiosInstance } from 'axios';
import { Time } from '../util/time';
import { BitbucketStagingStrategy, BitbucketProdStrategy, JiraStagingStrategy, JiraProdStrategy } from './strategy';
import { Container } from '../container';
import { configuration } from '../config/configuration';
import { Resources } from '../resources';
import * as fs from "fs";
var tunnel = require("tunnel");

export class OAuthRefesher implements Disposable {
    private _axios: AxiosInstance = axios.create({
        timeout: 30 * Time.SECONDS,
        headers: {
            'User-Agent': 'atlascode/2.x',
            "Accept-Encoding": "gzip, deflate"
        }
    });

    dispose() {

    }

    public async getNewAccessToken(provider: OAuthProvider, refreshToken: string): Promise<string | undefined> {

        const product = (provider.startsWith('jira')) ? ProductJira : ProductBitbucket;

        if (product === ProductJira) {
            const strategy = provider.endsWith('staging') ? JiraStagingStrategy : JiraProdStrategy;
            const tokenResponse = await this._axios(strategy.tokenURL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    grant_type: 'refresh_token',
                    client_id: strategy.clientID,
                    client_secret: strategy.clientSecret,
                    refresh_token: refreshToken,
                    redirect_uri: strategy.callbackURL,
                }),
                httpsAgent: this.getAgent()
            });

            const data = tokenResponse.data;
            return data.access_token;

        } else {
            const strategy = provider.endsWith('staging') ? BitbucketStagingStrategy : BitbucketProdStrategy;
            const basicAuth = Buffer.from(`${strategy.clientID}:${strategy.clientSecret}`).toString('base64');

            const tokenResponse = await this._axios(strategy.tokenURL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${basicAuth}`
                },
                data: `grant_type=refresh_token&refresh_token=${refreshToken}`,
                httpsAgent: this.getAgent()
            });

            const data = tokenResponse.data;
            return data.access_token;
        }
    }

    private getAgent(): any {
        let agent = undefined;
        const section = "enableCharles";
        try {
            if (Container.isDebugging && configuration.get<boolean>(section)) {
                let pemFile = fs.readFileSync(Resources.charlesCert);

                agent = tunnel.httpsOverHttp({
                    ca: [pemFile],
                    proxy: {
                        host: "127.0.0.1",
                        port: 8888
                    }
                });
            } else {
                agent = undefined;
            }

        } catch (err) {
            agent = undefined;
        }
        return agent;
    }
}
