import * as escapeStringRegexp from 'escape-string-regexp';
import { BitbucketHost } from '../hosts/bitbucket';
import { BitbucketServerHost } from '../hosts/bitbucket-server';
import { Host, HostConfig } from '../hosts/host-base';
import { bitbucketHosts } from '../settings';
import { Shell } from '../../util/shell';

export interface BitbucketRemote {
  name: string;
  host: string;
  repo: string;
}

export abstract class Backend {

  protected shell: Shell;

  constructor(public readonly root: string) {
    this.shell = new Shell(root);
  }

  /**
   * Get a regex match of the first remote containing a Bitbucket host.
   */
  public async findRemoteHost(): Promise<Host> {
    const remotes = await this.getRemoteList();
    const hosts = bitbucketHosts();

    for (const host of hosts) {
      const pattern = new RegExp(`^(\\w+)\\s.*(${escapeStringRegexp(host.gitHost)})[:/]([\\w\.\-]+/[\\w\.\-]+)(?:\.git)`);

      for (const remote of remotes) {
        const matches = pattern.exec(remote);
        if (matches) {
          const config: HostConfig = {
            name: matches[1],
            gitHost: host.gitHost,
            webHost: host.webHost,
            repo: matches[3]
          };
          switch (host.type) {
            case 'bitbucket':
            case 'bitbucket-staging':
              return new BitbucketHost(config);
            case 'bitbucket-server':
              return new BitbucketServerHost(config);
            default: throw new Error(`Unknown host type: ${host.type}`);
          }
        }
      }
    }

    const candidates = hosts.map(host => host.gitHost).join(' | ');
    throw new Error(`Unable to find a remote matching: ${candidates}`);
  }

  /**
   * Get the hash of the commit/changeset that's currently checked out.
   */
  public abstract async findCurrentRevision(): Promise<string>;

  /**
   * Get the hash of the revision associated with the current line.
   */
  public abstract async findSelectedRevision(file: string, line: number): Promise<string>;

  /**
   * Get the default branch for the current repo.
   */
  public abstract async getDefaultBranch(): Promise<string>;

  /**
   * Get the Bitbucket pull request ID where a given change was merged.
   *
   * This method invokes `git rev-list` to compute the merge commit for Git
   * repos. For Mercurial repos it uses `hg log -r` to query for the
   * changeset using Mercurial's revset syntax.
   *
   * This method then uses `git show` for Git repos and `hg log -r` for
   * Mercurial repos and scans the commit message for an explicit mention of
   * a pull request, which is populated by default in the Bitbucket UI.
   *
   * This won't work if the author of the PR wrote a custom commit message
   * without mentioning the PR.
   */
  public abstract async getPullRequestId(targetRevision: string): Promise<number>;

  /**
   * Get the list of remotes for the current repo.
   */
  public abstract async getRemoteList(): Promise<string[]>;

  /**
   * Get the commit message for a revision
   */
  public abstract async getRevisionMessage(targetRevision: string): Promise<string>;
}
