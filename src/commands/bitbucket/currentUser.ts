import { getCurrentUser } from "../../bitbucket/user";
import { User } from "../../bitbucket/model";

export async function currentUserBitbucket(): Promise<User> {
    const user = await getCurrentUser();
    return user;
}
