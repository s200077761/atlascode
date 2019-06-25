import { Container } from "../../container";
import { ProductJira, DetailedSiteInfo } from "../../atlclients/authInfo";

export async function currentUserJira(site?: DetailedSiteInfo): Promise<JIRA.Schema.User> {
    let effectiveSite = site;
    if (!effectiveSite) {
        effectiveSite = Container.siteManager.effectiveSite(ProductJira);
    }

    const client = await Container.clientManager.jirarequest(Container.siteManager.effectiveSite(ProductJira));
    const resp = await client.myself.getCurrentUser({});
    return resp.data;
}
