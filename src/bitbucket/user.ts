import { Atl } from '../atlclients/clientManager';

export async function getCurrentUser(): Promise<Bitbucket.Schema.User> {
    let bbreq = await Atl.bbrequest();
    if (!bbreq) { return Promise.reject(new Error('could not fetch current user')); }

    const { data } = await bbreq.user.get('');
    return data;
}