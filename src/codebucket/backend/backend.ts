import { clientForSite, firstBitbucketRemote, siteDetailsForRemote, workspaceRepoFor } from '../../bitbucket/bbUtils';
import { Container } from '../../container';
import { Repository } from '../../typings/git';
import { Shell } from '../../util/shell';
import { PRFileDiffQueryParams } from '../../views/pullrequest/pullRequestNode';
import { PullRequestNodeDataProvider } from '../../views/pullRequestNodeDataProvider';
import { CommandBase } from '../command/command-base';
import { BitbucketCloudSite } from '../hosts/bitbucket-cloud';
import { BitbucketServerSite } from '../hosts/bitbucket-server';
import { BitbucketSite } from '../hosts/bitbucket-site-base';

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
      const queryParams = JSON.parse(editor.document.uri.query) as PRFileDiffQueryParams;
      editorUri = queryParams.repoUri;
    }

    const result = Container.bitbucketContext.getBitbucketRepositories().find(repo => editorUri.startsWith(repo.rootUri.toString()));
    if (!result) {
      throw new Error('Unable to find a Bitbucket repository');
    }
    return result;
  }

  /**
   * Get the remote Bitbucket site.
   */
  public async findBitbucketSite(): Promise<BitbucketSite> {
    const repo = this.findRepository();
    const remote = firstBitbucketRemote(repo);
    const site = siteDetailsForRemote(remote)!;
    return site.isCloud ? new BitbucketCloudSite(site, remote) : new BitbucketServerSite(site, remote);
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
    const output = await this.shell.output(`git blame --root -l -L ${line},${line} ${file}`);
    const match = output.match(/^(\w+)/);
    if (match) {
      return match[1];
    }
    throw new Error('Unable to find the selected revision');
  }

  /**
   * Get the Bitbucket pull request ID where a given change was merged.
   */
  public async getPullRequestId(targetRevision: string): Promise<number> {
    const editor = CommandBase.getOpenEditor();
    if (editor.document.uri.scheme === PullRequestNodeDataProvider.SCHEME) {
      const queryParams = JSON.parse(editor.document.uri.query) as PRFileDiffQueryParams;
      return queryParams.prId;
    }

    const repo = this.findRepository();
    const wsRepo = workspaceRepoFor(repo);
    const site = wsRepo.mainSiteRemote.site;
    if (site) {
      const bbApi = await clientForSite(site);
      const prs = await bbApi.repositories.getPullRequestIdsForCommit(site, targetRevision);
      if (prs.length > 0) {
        return prs[prs.length - 1];
      }
    }

    throw new Error('Unable to determine the pull request');
  }
}
