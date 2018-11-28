import * as path from 'path';
import { Host, HostConfig } from './host-base';

export class BitbucketHost extends Host {

  constructor(cfg: HostConfig) {
    super(cfg);
  }

  public getChangeSetUrl(revision: string, filePath: string): string {
    return `${this.webHost}/${this.repo}/commits/${revision}#chg-${encodeURIComponent(filePath)}`;
  }

  public getSourceUrl(revision: string, filePath: string, lineRanges: string[]) {
    const ranges = lineRanges.join(',');
    const hash = `${encodeURIComponent(path.basename(filePath))}-${ranges}`;
    return `${this.webHost}/${this.repo}/src/${revision}/${encodeURIComponent(filePath)}#${hash}`;
  }

  public getPullRequestUrl(id: number, filePath: string): string {
    return `${this.webHost}/${this.repo}/pull-requests/${id}/diff#chg-${encodeURIComponent(filePath)}`;
  }
}
