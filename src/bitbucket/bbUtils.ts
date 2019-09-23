import { Repository, Remote } from "../typings/git";
import { ProductBitbucket, DetailedSiteInfo } from "../atlclients/authInfo";
import * as gup from 'git-url-parse';
import { Container } from "../container";
import { bbAPIConnectivityError } from "../constants";
import { BitbucketApi } from "./model";

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

export function getBitbucketCloudRemotes(repository: Repository): Remote[] {
    return repository.state.remotes.filter(remote => {
        const details = siteDetailsForRemote(remote);
        if (details) {
            return details.isCloud;
        }
        return false;
    });
}

export function siteDetailsForRemote(remote: Remote): DetailedSiteInfo | undefined {
    const parsed = parseGitUrl(urlForRemote(remote));
    const site = Container.siteManager.getSiteForHostname(ProductBitbucket, parsed.resource);
    if (site) {
        return site;
    }

    const hostname = parsed.source;
    if (hostname.includes('bitbucket.org') || hostname.includes('bitbucket_org') || hostname.includes('bitbucket-org')) {
        return Container.siteManager.getSiteForHostname(ProductBitbucket, 'bitbucket.org');
    }

    return undefined;
}

export function urlForRemote(remote: Remote): string {
    return remote.fetchUrl! || remote.pushUrl!;
}

export async function clientForRemote(remote: Remote): Promise<BitbucketApi> {
    let site = siteDetailsForRemote(remote);

    if (site) {
        return await Container.clientManager.bbClient(site);
    }

    return Promise.reject(bbAPIConnectivityError);
}

export async function clientForHostname(hostname: string): Promise<BitbucketApi> {
    let site = Container.siteManager.getSiteForHostname(ProductBitbucket, hostname);

    if (site) {
        return await Container.clientManager.bbClient(site);
    }

    return Promise.reject(bbAPIConnectivityError);
}

// Use only for bitbucket repositories
export function firstBitbucketRemote(repo: Repository): Remote {
    const remotes = getBitbucketRemotes(repo);

    let remote: Remote | undefined;
    if (remote = remotes.find(r => r.name === 'origin')) {
        return remote;
    }
    if (remote = remotes.find(r => r.name === 'upstream')) {
        return remote;
    }
    return remotes[0];
}
