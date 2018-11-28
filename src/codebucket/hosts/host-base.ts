export interface HostConfig {
  name: string;
  webHost: string;
  gitHost: string;
  repo: string;
}

export abstract class Host {
  constructor(
    private readonly cfg: HostConfig) {
  }

  get name(): string {
    return this.cfg.name;
  }

  get webHost(): string {
    return this.cfg.webHost;
  }

  get gitHost(): string {
    return this.cfg.gitHost;
  }

  get repo(): string {
    return this.cfg.repo;
  }

  public abstract getChangeSetUrl(revision: string, filePath: string): string;
  public abstract getSourceUrl(revision: string, filePath: string, lineRanges: string[]): string;
  public abstract getPullRequestUrl(id: number, filePath: string): string;
}
