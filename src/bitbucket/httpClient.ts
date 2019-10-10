import axios, { AxiosResponse, AxiosInstance } from 'axios';
import { Time } from '../util/time';
import { Container } from '../container';
import { Logger } from '../logger';
require('request-to-curl');
export class Client {
    private transport: AxiosInstance;

    constructor(
        private baseUrl: string,
        private authHeader: string,
        private agent: any,
        private errorHandler: (errJson: AxiosResponse) => Promise<Error>
    ) {
        this.transport = axios.create({
            timeout: 10 * Time.SECONDS,
            headers: {
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
                Authorization: this.authHeader
            },
            ...this.agent
        });

        if (Container.config.enableCurlLogging) {
            this.transport.interceptors.response.use(response => {
                try {
                    Logger.debug("-".repeat(70));
                    
                    Logger.debug(response.request.toCurl());
                    Logger.debug("-".repeat(70));
                } catch (cerr) {
                    //ignore
                }
                return response;
            },
                async error => {
                    try {
                        Logger.debug("-".repeat(70));
                        
                        Logger.debug(error.response.request.toCurl());
                        Logger.debug("-".repeat(70));
                    } catch (cerr) {
                        //ignore
                    }
                    return Promise.reject(error);
                }
            );
        }

        this.transport.interceptors.response.use(
            response => response,
            async error => {
                return error.response
                    ? Promise.reject(await this.errorHandler(error.response))
                    : Promise.reject(error);
            }
        );

    }

    async get(urlSlug: string, queryParams?: any) {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        const res = await this.transport(url, {
            method: "GET"
        });
        return { data: res.data, headers: res.headers };
    }

    async getURL(url: string) {
        const res = await this.transport(url, {
            method: "GET"
        });
        return { data: res.data, headers: res.headers };
    }

    async getOctetStream(urlSlug: string, queryParams?: any) {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        const res = await this.transport(url, {
            method: "GET",
            headers: {
                "accept": "application/octet-stream"
            }
        });
        return { data: res.data, headers: res.headers };
    }

    async post(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        try {
            const res = await this.transport(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: this.authHeader
                },
                data: JSON.stringify(body),
                ...this.agent
            });

            return { data: res.data, headers: res.headers };
        } catch (e) {
            if (e.response) {
                return Promise.reject(await this.errorHandler(e.response));
            } else {
                return Promise.reject(e);
            }

        }
    }

    async put(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        const res = await this.transport(url, {
            method: "PUT",
            data: JSON.stringify(body)
        });

        return { data: res.data, headers: res.headers };
    }

    async delete(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        const res = await this.transport(url, {
            method: "DELETE",
            data: JSON.stringify(body)
        });

        return { data: res.data, headers: res.headers };
    }

    generateUrl(urlSlug: string, queryParams?: any): string {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        return url;
    }

    private addQueryParams(url: string, queryParams?: any): string {
        let result = url;
        if (queryParams) {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(queryParams)) {
                sp.append(k, `${v}`);
            }
            result = `${result}?${sp.toString()}`;
        }

        return result;
    }
}

// ClientError wraps Error with a toJSON() method so that it can be passed as 
// part of a message to the webviews because Error fields are not enumerable
// by default
export class ClientError implements Error {

    constructor(public name: string, public message: string) { }

    toJSON() {
        return {
            name: this.name,
            message: this.message
        };
    }
}