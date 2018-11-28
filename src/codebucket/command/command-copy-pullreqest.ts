import { BitbucketPullRequestCommand } from "./command-pullrequest";
import * as clipboardy from "clipboardy";

export class CopyBitbucketPullRequestCommand extends BitbucketPullRequestCommand {

  protected async execute(): Promise<void> {
    const url = await this.pullRequestUrl();
 
    clipboardy.writeSync(url);
  }

}
