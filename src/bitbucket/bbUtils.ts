import { Repository, Remote } from "../typings/git";
import { ProductBitbucket, DetailedSiteInfo } from "../atlclients/authInfo";
import * as gup from 'git-url-parse';
import { Container } from "../container";
import { bbAPIConnectivityError } from "../constants";

export function parseGitUrl(url: string): gup.GitUrl {
    const parsed = gup(url);
    if (parsed.owner.startsWith('scm/')) {
        parsed.owner = parsed.owner.slice(4);
    }
    return parsed;
}

export function getBitbucketRemotes(repository: Repository): Remote[] {
    return repository.state.remotes.filter(remote => {
        return siteDetailsForRemote(remote) !== undefined;
    });
}

export function siteDetailsForRemote(remote: Remote): DetailedSiteInfo | undefined {
    let parsed = parseGitUrl(urlForRemote(remote));
    return Container.siteManager.getSiteForHostname(ProductBitbucket, parsed.resource);
}

export function siteDetailsForRepository(repository: Repository): DetailedSiteInfo | undefined {
    let foundSite = undefined;

    for (const remote of repository.state.remotes) {
        if (remote.pushUrl || remote.fetchUrl) {
            foundSite = siteDetailsForRemote(remote);
            if (foundSite) {
                break;
            }
        }
    }

    return foundSite;
}

export function urlForRemote(remote: Remote): string {
    return remote.fetchUrl! || remote.pushUrl!;
}

export async function clientForRemote(remote: Remote): Promise<Bitbucket | BitbucketServer> {
    let site = siteDetailsForRemote(remote);

    if (site) {
        return await Container.clientManager.bbrequest(site);
    }

    return Promise.reject(bbAPIConnectivityError);
}

export async function clientForHostname(hostname: string): Promise<Bitbucket | BitbucketServer> {
    let site = Container.siteManager.getSiteForHostname(ProductBitbucket, hostname);

    if (site) {
        return await Container.clientManager.bbrequest(site);
    }

    return Promise.reject(bbAPIConnectivityError);
}
