import { BitbucketSite } from './bitbucket-site-base';
import { parseGitUrl } from '../../bitbucket/bbUtils';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Remote } from '../../typings/git';

export class BitbucketServerHost extends BitbucketSite {

  constructor(site: DetailedSiteInfo, remote: Remote) {
    super(site, remote);
  }

  public getChangeSetUrl(revision: string, filePath: string): string {
    const { project, repo } = this.parseRepo();
    return `${this.site.baseLinkUrl}/projects/${project}/repos/${repo}/commits/${revision}#${encodeURIComponent(filePath)}`;
  }

  public getSourceUrl(revision: string, filePath: string, lineRanges: string[]): string {
    const { project, repo } = this.parseRepo();
    const hash = lineRanges.map(range => range.replace(':', '-')).join(',');
    return `${this.site.baseLinkUrl}/projects/${project}/repos/${repo}/browse/${encodeURIComponent(filePath)}?at=${revision}#${hash}`;
  }

  public getPullRequestUrl(id: number, filePath: string): string {
    const { project, repo } = this.parseRepo();
    return `${this.site.baseLinkUrl}/projects/${project}/repos/${repo}/pull-requests/${id}/diff#${encodeURIComponent(filePath)}`;
  }

  private parseRepo(): { project: string; repo: string } {
    const parsed = parseGitUrl(this.remote.fetchUrl! || this.remote.pushUrl!);

    return { project: parsed.owner, repo: parsed.name };
  }

}
