import { getCurrentUser } from "../../bitbucket/user";
import { Container } from "../../container";
import { ProductBitbucket } from "../../atlclients/authInfo";

export async function currentUserBitbucket(): Promise<Bitbucket.Schema.User> {
    const user = await getCurrentUser(Container.siteManager.effectiveSite(ProductBitbucket));
    return user;
}
