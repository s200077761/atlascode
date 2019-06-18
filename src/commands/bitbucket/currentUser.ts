import { Container } from "../../container";
import { ProductBitbucket, DetailedSiteInfo } from "../../atlclients/authInfo";

export async function currentUserBitbucket(site?: DetailedSiteInfo): Promise<Bitbucket.Schema.User> {
    let effectiveSite = site;
    if (!effectiveSite) {
        effectiveSite = Container.siteManager.effectiveSite(ProductBitbucket);
    }

    const bbreq = await Container.clientManager.bbrequest(effectiveSite);
    const { data } = await bbreq.user.get('');
    return data;
}
