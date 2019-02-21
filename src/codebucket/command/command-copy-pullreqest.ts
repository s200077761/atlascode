import * as vscode from 'vscode';
import { BitbucketPullRequestCommand } from "./command-pullrequest";
import { prUrlCopiedEvent } from '../../analytics';
import { Container } from '../../container';

export class CopyBitbucketPullRequestCommand extends BitbucketPullRequestCommand {

  protected async execute(): Promise<void> {
    const url = await this.pullRequestUrl();
    await vscode.env.clipboard.writeText(url);
    prUrlCopiedEvent().then(e => { Container.analyticsClient.sendTrackEvent(e); });

  }

}
