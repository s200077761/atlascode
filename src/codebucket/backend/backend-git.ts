import { Backend } from './backend-base';
import { PullRequestNodeDataProvider } from '../../views/pullRequestNodeDataProvider';
import { FileDiffQueryParams } from '../../views/nodes/pullRequestNode';
import { CommandBase } from '../command/command-base';

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

    const mergeRevision = await this.getMergeRevision(targetRevision);
    const message = await this.getRevisionMessage(mergeRevision);

    const match = message.match(/pull request #(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }

    throw new Error('Unable to determine the pull request where the commit was merged');
  }

  public async getRemoteList(): Promise<string[]> {
    return await this.shell.lines('git remote -v');
  }

  public async getRevisionMessage(revision: string): Promise<string> {
    return await this.shell.output(`git show ${revision} --format="%s%n%n%b" --no-patch`);
  }

  private async getMergeRevision(targetRevision: string): Promise<string> {
    const defaultBranch = await this.getDefaultBranch();
    const revspec = `${targetRevision}..${defaultBranch}`;

    // First find the merge commit where the given commit was merged into the default branch.
    const ancestryPath = await this.shell.lines(`git rev-list ${revspec} --ancestry-path --merges`);
    const firstParent = await this.shell.lines(`git rev-list ${revspec} --first-parent --merges`);

    const firstParentSet = new Set(firstParent);
    const mergeRevision = ancestryPath.reverse().find(path => firstParentSet.has(path));
    if (!mergeRevision) {
      throw new Error('Unable to determine the merge commit');
    }
    return mergeRevision;
  }

}
