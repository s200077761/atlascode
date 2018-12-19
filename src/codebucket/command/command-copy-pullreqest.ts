import * as vscode from 'vscode';
import { BitbucketPullRequestCommand } from "./command-pullrequest";

export class CopyBitbucketPullRequestCommand extends BitbucketPullRequestCommand {

  protected async execute(): Promise<void> {
    const url = await this.pullRequestUrl();
    await vscode.env.clipboard.writeText(url);
  }

}
