import { Uri } from 'vscode';
import { Backend } from './backend-base';
import { PullRequestNodeDataProvider } from '../../views/pullRequestNodeDataProvider';
import { FileDiffQueryParams } from '../../views/pullrequest/pullRequestNode';
import { CommandBase } from '../command/command-base';
import { Container } from '../../container';
import { getBitbucketRemotes } from '../../bitbucket/bbUtils';
import { RepositoryProvider } from '../../bitbucket/repoProvider';

export class GitBackend extends Backend {
  public static root = 'git rev-parse --show-toplevel';

  constructor(workingDirectory: string) {
    super(workingDirectory);
  }

  public async findCurrentRevision(): Promise<string> {
    const editor = CommandBase.getOpenEditor();
    if (editor.document.uri.scheme === PullRequestNodeDataProvider.SCHEME) {
      const queryParams = JSON.parse(editor.document.uri.query) as FileDiffQueryParams;
      return queryParams.commitHash;
    }

    const lines = await this.shell.lines('git show HEAD');
    for (const line of lines) {
      const match = line.match(/commit (\w+)/);
      if (match) {
        return match[1];
      }
    }
    throw new Error('Unable to get the current revision');
  }

  public async findSelectedRevision(file: string, line: number): Promise<string> {
    const output = await this.shell.output(`git blame --root -L ${line},${line} ${file}`);
    const match = output.match(/^(\w+)/);
    if (match) {
      return match[1];
    }
    throw new Error('Unable to find the selected revision');
  }

  public async getDefaultBranch(): Promise<string> {
    const remote = await this.findRemoteHost();
    try {
      return await this.shell.output(`git rev-parse --abbrev-ref refs/remotes/${remote.name}/HEAD`);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error(`No remote HEAD found, falling back to ${remote.name}/master`);
      return `${remote.name}/master`;
    }
  }

  public async getPullRequestId(targetRevision: string): Promise<number> {
    const editor = CommandBase.getOpenEditor();
    if (editor.document.uri.scheme === PullRequestNodeDataProvider.SCHEME) {
      const queryParams = JSON.parse(editor.document.uri.query) as FileDiffQueryParams;
      return queryParams.prId;
    }

    const repo = Container.bitbucketContext.getRepository(Uri.file(this.root));
    const remotes = getBitbucketRemotes(repo!);
    if (remotes.length > 0) {
      const prs = await RepositoryProvider.forRemote(remotes[0]).getPullRequestsForCommit(remotes[0], targetRevision);
      if (prs.length > 0) {
        return prs[0].id!;
      }
    }

    throw new Error('Unable to determine the pull request');
  }

  public async getRemoteList(): Promise<string[]> {
    return await this.shell.lines('git remote -v');
  }

  public async getRevisionMessage(revision: string): Promise<string> {
    return await this.shell.output(`git show ${revision} --format="%s%n%n%b" --no-patch`);
  }
}
