import { getCurrentUser } from "../../bitbucket/user";

export async function currentUserBitbucket(): Promise<Bitbucket.Schema.User> {
    const user = await getCurrentUser();
    return user;
}
