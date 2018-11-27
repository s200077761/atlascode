import { Host, HostConfig } from './host-base';

export class BitbucketServerHost extends Host {

  constructor(cfg: HostConfig) {
    super(cfg);
  }

  public getChangeSetUrl(revision: string, filePath: string): string {
    const { project, repo } = this.parseRepo();
    return `${this.webHost}/projects/${project}/repos/${repo}/commits/${revision}#${encodeURIComponent(filePath)}`;
  }

  public getSourceUrl(revision: string, filePath: string, lineRanges: string[]): string {
    const { project, repo } = this.parseRepo();
    const hash = lineRanges.map(range => range.replace(':', '-')).join(',');
    return `${this.webHost}/projects/${project}/repos/${repo}/browse/${encodeURIComponent(filePath)}#${hash}`;
  }

  public getPullRequestUrl(id: number, filePath: string): string {
    const { project, repo } = this.parseRepo();
    return `${this.webHost}/projects/${project}/repos/${repo}/pull-requests/${id}/diff#${encodeURIComponent(filePath)}`;
  }

  private parseRepo(): { project: string; repo: string } {
    const path = this.repo.split('/');
    const proj = path.shift();

    if (!proj) {
      throw new Error(`Unexpected repository format: ${this.repo}`);
    }

    const project = encodeURIComponent(proj.toUpperCase());
    const repo = path.map(segment => encodeURIComponent(segment)).join('/');

    return { project, repo };
  }

}
