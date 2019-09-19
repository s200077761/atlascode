import { Container } from "../../container";
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { User } from "../../jira/jira-client/model/entities";


export async function currentUserJira(site: DetailedSiteInfo): Promise<User> {
    const client = await Container.clientManager.jiraClient(site);
    const resp = await client.getCurrentUser();
    return resp;
}
