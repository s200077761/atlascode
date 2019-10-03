import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { Remote } from "../../typings/git";

export abstract class BitbucketSite {
  constructor(
    protected site: DetailedSiteInfo, protected remote: Remote) {
  }

  public abstract getChangeSetUrl(revision: string, filePath: string): string;
  public abstract getSourceUrl(revision: string, filePath: string, lineRanges: string[]): string;
  public abstract getPullRequestUrl(id: number, filePath: string): string;
}
