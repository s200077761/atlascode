import * as path from 'path';
import { BitbucketSite } from './bitbucket-site-base';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Remote } from '../../typings/git';
import { parseGitUrl } from '../../bitbucket/bbUtils';

export class BitbucketCloudHost extends BitbucketSite {

  constructor(site: DetailedSiteInfo, remote: Remote) {
    super(site, remote);
  }

  public getChangeSetUrl(revision: string, filePath: string): string {
    const { project, repo } = this.parseRepo();
    return `${this.site.baseLinkUrl}/${project}/${repo}/commits/${revision}#chg-${filePath}`;
  }

  public getSourceUrl(revision: string, filePath: string, lineRanges: string[]) {
    const ranges = lineRanges.join(',');
    const hash = `${encodeURIComponent(path.basename(filePath))}-${ranges}`;
    const { project, repo } = this.parseRepo();
    return `${this.site.baseLinkUrl}/${project}/${repo}/src/${revision}/${filePath}#${hash}`;
  }

  public getPullRequestUrl(id: number, filePath: string): string {
    const { project, repo } = this.parseRepo();
    return `${this.site.baseLinkUrl}/${project}/${repo}/pull-requests/${id}/diff#chg-${filePath}`;
  }

  private parseRepo(): { project: string; repo: string } {
    const parsed = parseGitUrl(this.remote.fetchUrl! || this.remote.pushUrl!);

    return { project: parsed.owner, repo: parsed.name };
  }
}
