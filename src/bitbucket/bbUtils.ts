import { Repository, Remote } from "../typings/git";
import { ProductBitbucket, DetailedSiteInfo } from "../atlclients/authInfo";
import * as gup from 'git-url-parse';
import { Container } from "../container";
import { bbAPIConnectivityError } from "../constants";

export function parseGitUrl(url: string): gup.GitUrl {
    return gup(url);
}

export function getBitbucketRemotes(repository: Repository): Remote[] {
    return repository.state.remotes.filter(remote => {
        return siteDetailsForRemote(remote) !== undefined;
    });
}

export function siteDetailsForRemote(remote: Remote): DetailedSiteInfo | undefined {
    let parsed = parseGitUrl(urlForRemote(remote));
    return Container.siteManager.getSiteForHostname(ProductBitbucket, parsed.source);
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

export async function clientForRemote(remote: Remote): Promise<Bitbucket> {
    let site = siteDetailsForRemote(remote);
    let client: Bitbucket | undefined = undefined;

    if (site) {
        client = await Container.clientManager.bbrequest(site);

        if (client) {
            return client;
        }
    }

    return Promise.reject(bbAPIConnectivityError);
}

export async function clientForHostname(hostname: string): Promise<Bitbucket> {
    let site = Container.siteManager.getSiteForHostname(ProductBitbucket, hostname);
    let client: Bitbucket | undefined = undefined;

    if (site) {
        client = await Container.clientManager.bbrequest(site);

        if (client) {
            return client;
        }
    }

    return Promise.reject(bbAPIConnectivityError);
}
