import { Logger } from "../logger";
import fetch from 'node-fetch';

// interface InstanceInfo {
//     baseUrl: string;
// }

export async function getJiraCloudBaseUrl(apiUrl: string, accessToken: string): Promise<string> {

    try {
        Logger.debug('fetching', `${apiUrl}/serverInfo`);
        Logger.debug(`Bearer ${accessToken}`);
        const res = await fetch(`${apiUrl}/serverInfo`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            }
        });
        Logger.debug('got server info response', res);
        const json = await res.json();

        Logger.debug('got server info json', json);
        return json.baseUrl;

    } catch (err) {
        Logger.error(new Error(`Error getting jira base url ${err}`));
        return Promise.reject(`Error getting jira base url ${err}`);
    }
}