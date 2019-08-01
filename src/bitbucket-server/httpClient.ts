import fetch from 'node-fetch';

export class Client {

    constructor(
        private baseUrl: string,
        private authHeader: string,
        private agent: any
    ) { }

    async get(urlSlug: string, queryParams?: any) {
        let url = `${this.baseUrl}${urlSlug}`;
        const sp = new URLSearchParams();
        sp.append('markup', 'true');
        sp.append('avatarSize', '64');
        if (queryParams) {
            for (const [k, v] of Object.entries(queryParams)) {
                sp.append(k, `${v}`);
            }
        }
        url = `${url}?${sp.toString()}`;
        const res = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authHeader
            },
            agent: this.agent
        });
        const responseObject = await res.json();
        return { data: responseObject, headers: res.headers };
    }

    async post(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        if (queryParams) {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(queryParams)) {
                sp.append(k, `${v}`);
            }
            url = `${url} ? ${sp.toString()}`;
        }
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authHeader
            },
            body: JSON.stringify(body),
            agent: this.agent
        });
        const responseObject = await res.json();
        return { data: responseObject, headers: res.headers };
    }

    async put(urlSlug: string, body: any, queryParams?: any): Promise<any> {
        let url = `${this.baseUrl}${urlSlug}`;
        if (queryParams) {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(queryParams)) {
                sp.append(k, `${v}`);
            }
            url = `${url} ? ${sp.toString()}`;
        }
        const res = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authHeader
            },
            body: JSON.stringify(body),
            agent: this.agent
        });
        const responseObject = await res.json();
        return { data: responseObject, headers: res.headers };
    }
}
