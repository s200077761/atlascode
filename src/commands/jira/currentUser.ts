import { Container } from "../../container";
import { ProductJira, DetailedSiteInfo } from "../../atlclients/authInfo";
import { User } from "../../jira/jira-client/model/entities";


export async function currentUserJira(site?: DetailedSiteInfo): Promise<User> {
    let effectiveSite = site;
    if (!effectiveSite) {
        effectiveSite = Container.siteManager.effectiveSite(ProductJira);
    }

    const client = await Container.clientManager.jiraClient(Container.siteManager.effectiveSite(ProductJira));
    const resp = await client.getCurrentUser();
    return resp;
}
