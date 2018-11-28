import * as url from 'url';
import * as vscode from 'vscode';

export type IssueTrackerConfig = JiraIssueTrackerConfig;

export type HostType = 'bitbucket' | 'bitbucket-server';

export interface HostSettings {
  type: HostType;
  gitHost: string;
  webHost: string;
}

export interface JiraIssueTrackerConfig {
  type: 'jira';
  host: string;
  projectKeys: string[];
}

export function bitbucketHosts(): HostSettings[] {
  const hosts: HostSettings[] = [{
    type: 'bitbucket',
    gitHost: 'bitbucket.org',
    webHost: 'https://bitbucket.org'
  }];
  const config = vscode.workspace.getConfiguration('codebucket');
  for (const host of config.get<string[]>('bitbucketHosts') || []) {
    hosts.push({
      type: 'bitbucket',
      gitHost: hostname(host),
      webHost: host
    });
  }
  for (const host of config.get<Array<Partial<HostSettings>>>('bitbucketServerHosts') || []) {
    hosts.push({
      type: 'bitbucket-server',
      gitHost: host.gitHost || hostname(host.webHost || ''),
      webHost: host.webHost || `https://${host.gitHost}`
    });
  }
  return hosts;
}

export function issueTrackers(): IssueTrackerConfig[] {
  const config = vscode.workspace.getConfiguration('codebucket');
  const trackers = config.get<IssueTrackerConfig[]>('issueTrackers') || [];
  return trackers.map(tracker => {
    return { ...tracker, host: hostname(tracker.host) };
  });
}

function hostname(name: string): string {
  const host = url.parse(name).host;
  if (!host) {
    throw new Error(`Could not parse host name: ${name}`);
  }
  return host;
}
