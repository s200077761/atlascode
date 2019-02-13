import { Repository, Remote } from "../typings/git";
import { PullRequestApi, GitUrlParse, bitbucketHosts } from "./pullRequests";
import { Container } from "../container";
import fetch from 'node-fetch';
import { AuthProvider } from "../atlclients/authInfo";
import { Logger } from "../logger";

export namespace PipelineApi {
  export async function getList(
    repository: Repository,
    branchName: string
  ): Promise<Bitbucket.Schema.Pipeline[]> {
      const remotes = PullRequestApi.getBitbucketRemotes(repository);
      const accessToken = await getAccessToken();
      return Promise.all(remotes.map(remote => {
        return getListForRemote(remote, branchName, accessToken);
      })).then(arrays => {
        return [].concat.apply([], arrays);
      });
  }

  export async function getRecentActivity(repository: Repository): Promise<Bitbucket.Schema.Pipeline[]> {
    const remotes = PullRequestApi.getBitbucketRemotes(repository);
    const accessToken = await getAccessToken();
    return Promise.all(remotes.map(remote => {
      return getPipelineResults(remote, accessToken);
    })).then(arrays => {
      return [].concat.apply([], arrays);
    });
  }

  export async function startPipeline(repository: Repository, branchName: string): Promise<Bitbucket.Schema.Pipeline> {
    const remotes = PullRequestApi.getBitbucketRemotes(repository);
    if (remotes.length > 0) {
      const remote = remotes[0];
      const remoteUrl = remote.fetchUrl! || remote.pushUrl!;
      let parsed = GitUrlParse(remoteUrl);
      const bb = await bitbucketHosts.get(parsed.source)();
      return bb.pipelines.create({_body: {target:{
          ref_type: "branch", 
          type: "pipeline_ref_target", 
          ref_name: branchName
        }}, repo_slug: parsed.name, username: parsed.owner}).
        then((res: Bitbucket.Response<Bitbucket.Schema.Pipeline>) => res.data);  
    }
    return Promise.reject("No remote associated with this repository.");
  }

  async function getAccessToken(): Promise<string> {
    return Container.authManager.getAuthInfo(
      AuthProvider.BitbucketCloud
    ).then(authInfo => authInfo!.access);
  }

  async function getListForRemote(
    remote: Remote,
    branchName: string,
    accessToken: string
  ): Promise<Bitbucket.Schema.Pipeline[]> {
    return getPipelineResults(remote, accessToken, `target.branch=${branchName}`);
  }

  async function getPipelineResults(
    remote: Remote,
    accessToken: string,
    query?: string
  ): Promise<Bitbucket.Schema.Pipeline[]> {
    let parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
    const bbBase = "https://api.bitbucket.org/";
    const pipelinesPath = `2.0/repositories/${parsed.owner}/${parsed.name}/pipelines/`;
    var queryParameters = "sort=-created_on";
    if (query) {
      queryParameters = `${query}&sort=-created_on`;
    }
    return fetch(`${bbBase}${pipelinesPath}?${queryParameters}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    })
    .then(res => res.json())
      .then((res: Bitbucket.Schema.PaginatedPipelines) => {
        if (res.values) {
          return res.values;
        }
        return [];
      })
      .catch((err: any) => {
        Logger.error(new Error(`Error getting pipelines ${err}`));
        return Promise.reject();
      });
  }
}
