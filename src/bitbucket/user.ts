import { Container } from '../container';
import { User } from './model';

export async function getCurrentUser(stagingUser: boolean = false): Promise<User> {
    let bbreq = stagingUser ? await Container.clientManager.bbrequestStaging() : await Container.clientManager.bbrequest();
    if (!bbreq) { return Promise.reject(new Error('could not fetch current user')); }

    const { data } = await bbreq.user.get('');
    return {
        accountId: data.account_id!,
        displayName: data.display_name!,
        url: data.links!.html!.href!,
        avatarUrl: data.links!.avatar!.href!
    };
}