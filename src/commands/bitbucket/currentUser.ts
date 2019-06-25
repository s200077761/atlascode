import { Container } from "../../container";
import { ProductBitbucket, DetailedSiteInfo } from "../../atlclients/authInfo";
import { User } from "../../bitbucket/model";

export async function currentUserBitbucket(site?: DetailedSiteInfo): Promise<User> {
    let effectiveSite = site;
    if (!effectiveSite) {
        effectiveSite = Container.siteManager.effectiveSite(ProductBitbucket);
    }

    const bbreq = await Container.clientManager.bbrequest(effectiveSite);
    const { data } = await bbreq.user.get('');
    return {
        accountId: data.account_id!,
        avatarUrl: data.links!.avatar!.href!,
        displayName: data.display_name!,
        url: data.links!.html!.href!

    };
}
