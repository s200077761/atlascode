import { Container } from '../container';
import { DetailedSiteInfo } from '../atlclients/authInfo';

export async function getCurrentUser(site: DetailedSiteInfo): Promise<Bitbucket.Schema.User> {
    let bbreq = await Container.clientManager.bbrequest(site);
    if (!bbreq) { return Promise.reject(new Error('could not fetch current user')); }

    const { data } = await bbreq.user.get('');
    return data;
}