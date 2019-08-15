import { BitbucketCloudHost } from '../hosts/bitbucket-cloud';
import { BitbucketServerHost } from '../hosts/bitbucket-server';
import { BitbucketSite } from '../hosts/bitbucket-site-base';
import { Shell } from '../../util/shell';
import { CommandBase } from '../command/command-base';
import { PullRequestNodeDataProvider } from '../../views/pullRequestNodeDataProvider';
import { FileDiffQueryParams } from '../../views/pullrequest/pullRequestNode';
import { Container } from '../../container';
import { firstBitbucketRemote, clientForRemote, siteDetailsForRemote } from '../../bitbucket/bbUtils';
import { Repository } from '../../typings/git';

export interface BitbucketRemote {
  name: string;
  host: string;
  repo: string;
}

export class Backend {

  private shell: Shell;
  public static root = 'git rev-parse --show-toplevel';

  constructor(public readonly root: string) {
    this.shell = new Shell(root);
  }

  /**
   * Get the repository corresponding to the open editor.
   */
  public findRepository(): Repository {
    const editor = CommandBase.getOpenEditor();
    let editorUri = editor.document.uri.toString();
    if (editor.document.uri.scheme === PullRequestNodeDataProvider.SCHEME) {
      const queryParams = JSON.parse(editor.document.uri.query) as FileDiffQueryParams;
      editorUri = queryParams.repoUri;
    }

    const result = Container.bitbucketContext.getBitbucketRepositores().find(repo => editorUri.startsWith(repo.rootUri.toString()));
    if (!result) {
      throw new Error('Unable to find a bitbucket repository');
    }
    return result;
  }

  /**
   * Get a regex match of the first remote containing a Bitbucket host.
   */
  public async findRemoteHost(): Promise<BitbucketSite> {
    const repo = this.findRepository();
    const remote = firstBitbucketRemote(repo);
    const site = await siteDetailsForRemote(remote)!;
    return site.isCloud ? new BitbucketCloudHost(site, remote) : new BitbucketServerHost(site, remote);
  }

  /**
   * Get the hash of the commit/changeset that's currently checked out.
   */
  public async findCurrentRevision(): Promise<string> {
    const repo = this.findRepository();
    if (repo.state.HEAD && repo.state.HEAD.commit) {
      return repo.state.HEAD.commit;
    }
    throw new Error('Unable to get the current revision');
  }

  /**
   * Get the hash of the revision associated with the current line.
   */
  public async findSelectedRevision(file: string, line: number): Promise<string> {
    const output = await this.shell.output(`git blame --root -L ${line},${line} ${file}`);
    const match = output.match(/^(\w+)/);
    if (match) {
      return match[1];
    }
    throw new Error('Unable to find the selected revision');
  }

  /**
   * Get the default branch for the current repo.
   */
  public async getDefaultBranch(): Promise<string> {
    const remote = firstBitbucketRemote(this.findRepository());
    try {
      return await this.shell.output(`git rev-parse --abbrev-ref refs/remotes/${remote.name}/HEAD`);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(`No remote HEAD found, falling back to ${remote.name}/master`);
      return `${remote.name}/master`;
    }
  }

  /**
   * Get the Bitbucket pull request ID where a given change was merged.
   */
  public async getPullRequestId(targetRevision: string): Promise<number> {
    const editor = CommandBase.getOpenEditor();
    if (editor.document.uri.scheme === PullRequestNodeDataProvider.SCHEME) {
      const queryParams = JSON.parse(editor.document.uri.query) as FileDiffQueryParams;
      return queryParams.prId;
    }

    const repo = this.findRepository();
    const remote = firstBitbucketRemote(repo);
    const bbApi = await clientForRemote(remote);
    const prs = await bbApi.repositories.getPullRequestIdsForCommit(repo, remote, targetRevision);
    if (prs.length > 0) {
      return prs[prs.length - 1];
    }

    throw new Error('Unable to determine the pull request');
  }
}
