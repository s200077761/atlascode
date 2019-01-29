import { Repository, Remote } from "../typings/git";
import { PullRequestApi, GitUrlParse } from "./pullRequests";
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
      const authInfo = await Container.authManager.getAuthInfo(
        AuthProvider.BitbucketCloud
      );
      const accessToken = authInfo!.access;
      return Promise.all(remotes.map(remote => {
        return getListForRemote(remote, branchName, accessToken);
      })).then(arrays => {
        return [].concat.apply([], arrays);
      });
  }

  async function getListForRemote(
    remote: Remote,
    branchName: string,
    accessToken: string
  ): Promise<Bitbucket.Schema.Pipeline[]> {
    let parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
    const bbBase = "https://api.bitbucket.org/";
    const pipelinesPath = `2.0/repositories/${parsed.owner}/${parsed.name}/pipelines/`;
    const targetBranchQuery = `target.branch=${branchName}&sort=-created_on`;
    return fetch (`${bbBase}${pipelinesPath}?${targetBranchQuery}`, {
      method: 'GET',
      headers:{
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
