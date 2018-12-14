import { Container } from '../container';

export async function getCurrentUser(stagingUser: boolean = false): Promise<Bitbucket.Schema.User> {
    let bbreq = stagingUser ? await Container.clientManager.bbrequestStaging() : await Container.clientManager.bbrequest();
    if (!bbreq) { return Promise.reject(new Error('could not fetch current user')); }

    const { data } = await bbreq.user.get('');
    return data;
}