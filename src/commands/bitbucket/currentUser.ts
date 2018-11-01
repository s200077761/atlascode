import { Logger } from "../../logger";
import { getCurrentUser } from "../../bitbucket/user";

export async function currentUserBitbucket(): Promise<Bitbucket.Schema.User> {
    const user = await getCurrentUser();
    Logger.debug(`currentUser is: ${user.display_name}`);
    return user;
}
