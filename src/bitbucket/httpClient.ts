import fetch, { Response } from 'node-fetch';

export class Client {

    constructor(
        private baseUrl: string,
        private authHeader: string,
        private agent: any,
        private errorHandler: (errJson: Response) => Promise<Error>
    ) { }

    async get(urlSlug: string, queryParams?: any) {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        const res = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authHeader
            },
            agent: this.agent
        });

        if (!res.ok && this.errorHandler) {
            return Promise.reject(await this.errorHandler(res));
        }

        const responseObject = await res.json();
        return { data: responseObject, headers: res.headers };
    }

    async getOctetStream(urlSlug: string, queryParams?: any) {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        const res = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "accept": "application/octet-stream",
                Authorization: this.authHeader
            },
            agent: this.agent
        });

        if (!res.ok && this.errorHandler) {
            return Promise.reject(await this.errorHandler(res));
        }

        const responseObject = await res.text();
        return { data: responseObject, headers: res.headers };
    }

    async post(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authHeader
            },
            body: JSON.stringify(body),
            agent: this.agent
        });

        if (!res.ok && this.errorHandler) {
            return Promise.reject(await this.errorHandler(res));
        }

        const responseObject = await res.json();
        return { data: responseObject, headers: res.headers };
    }

    async put(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authHeader
            },
            body: JSON.stringify(body),
            agent: this.agent
        });

        if (!res.ok && this.errorHandler) {
            return Promise.reject(await this.errorHandler(res));
        }

        const responseObject = await res.json();
        return { data: responseObject, headers: res.headers };
    }

    async delete(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        url = this.addQueryParams(url, queryParams);

        const res = await fetch(url, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authHeader
            },
            body: JSON.stringify(body),
            agent: this.agent
        });

        if (!res.ok && this.errorHandler) {
            return Promise.reject(await this.errorHandler(res));
        }

        const responseObject = await res.json();
        return { data: responseObject, headers: res.headers };
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