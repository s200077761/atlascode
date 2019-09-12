import axios, { AxiosResponse } from 'axios';

export class Client {

    constructor(
        private baseUrl: string,
        private authHeader: string,
        private agent: any,
        private errorHandler: (errJson: AxiosResponse) => Promise<Error>
    ) { }

    async get(urlSlug: string, queryParams?: any) {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        try {
            const res = await axios(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: this.authHeader
                },
                httpsAgent: this.agent
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

    async getURL(url: string) {

        try {
            const res = await axios(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: this.authHeader
                },
                httpsAgent: this.agent
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

    async getOctetStream(urlSlug: string, queryParams?: any) {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        try {
            const res = await axios(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "accept": "application/octet-stream",
                    Authorization: this.authHeader
                },
                httpsAgent: this.agent
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

    async post(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        try {
            const res = await axios(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: this.authHeader
                },
                data: JSON.stringify(body),
                httpsAgent: this.agent
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

        try {
            const res = await axios(url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: this.authHeader
                },
                data: JSON.stringify(body),
                httpsAgent: this.agent
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

    async delete(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        try {
            const res = await axios(url, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: this.authHeader
                },
                data: JSON.stringify(body),
                httpsAgent: this.agent
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