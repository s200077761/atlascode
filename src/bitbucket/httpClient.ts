import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { addCurlLogging } from '../atlclients/interceptors';
import { Container } from '../container';
import { Time } from '../util/time';

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
            addCurlLogging(this.transport);
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
        let url = `${urlSlug.startsWith("http") ? '' : this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);
        const res = await this.transport(url, {
            method: "GET"
        });
        return { data: res.data, headers: res.headers };
    }

    async getRaw(urlSlug: string, queryParams?: any) {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        const res = await this.transport(url, {
            method: "GET",
            // axios tries to parse response as JSON by default
            // prevent that and pass through the raw data
            transformResponse: data => data
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
        let url = `${urlSlug.startsWith("http") ? '' : this.baseUrl}${urlSlug}`;
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
        let url = `${urlSlug.startsWith("http") ? '' : this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        const res = await this.transport(url, {
            method: "PUT",
            data: JSON.stringify(body)
        });

        return { data: res.data, headers: res.headers };
    }

    async delete(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${urlSlug.startsWith("http") ? '' : this.baseUrl}${urlSlug}`;
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