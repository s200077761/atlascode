import { Logger } from "../logger";

interface InstanceInfo {
    baseUrl: string;
}

export async function getJiraCloudBaseUrl(apiUrl: string, accessToken: string): Promise<string> {

    return fetch(`${apiUrl}/serverInfo`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        }
    })
        .then(res => res.json())
        .then((res: InstanceInfo) => {

            return res.baseUrl;
        })
        .catch((err: any) => {
            Logger.error(new Error(`Error getting jira base url ${err}`));
            return Promise.reject();
        });
}