import { Repository, Remote } from "../typings/git";
import { Container } from "../container";
import fetch from 'node-fetch';
import { Logger } from "../logger";
import { Pipeline, PipelineResult, PipelineStep, PipelineCommand } from "../pipelines/model";
import { parseGitUrl, urlForRemote, siteDetailsForRemote, firstBitbucketRemote } from "../bitbucket/bbUtils";
import { bbAPIConnectivityError } from "../constants";
import { CloudRepositoriesApi } from "../bitbucket/repositories";

export class PipelineApiImpl {

  constructor(private _client: Bitbucket) { }

  async getList(
    repository: Repository,
    branchName: string
  ): Promise<Pipeline[]> {
    const remote = firstBitbucketRemote(repository);
    const accessToken = await this.getValidPipelinesAccessToken(remote);
    return this.getListForRemote(remote, branchName, accessToken);
  }

  async getRecentActivity(repository: Repository): Promise<Pipeline[]> {
    const remote = firstBitbucketRemote(repository);
    const accessToken = await this.getValidPipelinesAccessToken(remote);
    return this.getPipelineResults(remote, accessToken);
  }

  async startPipeline(repository: Repository, branchName: string): Promise<Pipeline> {
    const remote = firstBitbucketRemote(repository);
    let parsed = parseGitUrl(urlForRemote(remote));
    return this._client.pipelines.create({
      //@ts-ignore
      _body: {
        target: {
          ref_type: "branch",
          type: "pipeline_ref_target",
          ref_name: branchName
        }
      }, repo_slug: parsed.name, username: parsed.owner
    }).
      then((res: Bitbucket.Response<Bitbucket.Schema.Pipeline>) => res.data);
  }

  async getPipeline(repository: Repository, uuid: string): Promise<Pipeline> {
    const remote = firstBitbucketRemote(repository);
    let parsed = parseGitUrl(urlForRemote(remote));
    return this._client.pipelines.get({ pipeline_uuid: uuid, repo_slug: parsed.name, username: parsed.owner })
      .then((res: Bitbucket.Schema.PaginatedPipelines) => {
        return PipelineApiImpl.pipelineForPipeline(remote, res.data);
      });
  }

  async getSteps(repository: Repository, uuid: string): Promise<PipelineStep[]> {
    const remote = firstBitbucketRemote(repository);
    let parsed = parseGitUrl(urlForRemote(remote));
    return this._client.pipelines.listSteps({ pipeline_uuid: uuid, repo_slug: parsed.name, username: parsed.owner })
      .then((res: Bitbucket.Schema.PaginatedPipelines) => {
        return res.data.values!.map((s: any) => PipelineApiImpl.pipelineStepForPipelineStep(s));
      });
  }

  async getStepLog(repository: Repository, pipelineUuid: string, stepUuid: string): Promise<string[]> {
    const remote = firstBitbucketRemote(repository);
    return this.getPipelineLog(remote, pipelineUuid, stepUuid);
  }

  async getValidPipelinesAccessToken(remote: Remote): Promise<string> {
    let site = siteDetailsForRemote(remote);

    if (site && site.isCloud) {
      const token = await Container.clientManager.getValidAccessToken(site);
      if (token) {
        return token;
      }
    }

    return Promise.reject(bbAPIConnectivityError);
  }

  async getListForRemote(
    remote: Remote,
    branchName: string,
    accessToken: string
  ): Promise<Pipeline[]> {
    return this.getPipelineResults(remote, accessToken, `target.branch=${encodeURIComponent(branchName)}`);
  }

  async getPipelineResults(
    remote: Remote,
    accessToken: string,
    query?: string
  ): Promise<Pipeline[]> {
    // TODO: [VSCODE-502] use site info and convert to async await with try/catch
    let parsed = parseGitUrl(urlForRemote(remote));
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
          return res.values.map(pipeline => {
            return PipelineApiImpl.pipelineForPipeline(remote, pipeline);
          });
        }
        return [];
      })
      .catch((err: any) => {
        Logger.error(new Error(`Error getting pipelines ${err}`));
        return Promise.reject();
      });
  }

  async getPipelineLog(remote: Remote,
    pipelineUuid: string,
    stepUuid: string): Promise<string[]> {
    let parsed = parseGitUrl(urlForRemote(remote));
    return this._client.pipelines.getStepLog({ pipeline_uuid: pipelineUuid, repo_slug: parsed.name, step_uuid: stepUuid, username: parsed.owner }).then((r: Bitbucket.Response<Bitbucket.Schema.PipelineVariable>) => {
      return PipelineApiImpl.splitLogs(r.data.toString());
    }).catch((err: any) => {
      // If we get a 404 it's probably just that there aren't logs yet.
      if (err.code !== 404) {
        Logger.error(new Error(`Error fetching pipeline logs: ${err}`));
      }
      return [];
    });
  }

  private static splitLogs(logText: string): string[] {
    const lines = logText.split('\n');
    var commandAccumulator = "";
    var lineIndex = 0;
    const splitLogs: string[] = [];

    // Trim any log output preceding the first command
    while (!lines[lineIndex].startsWith("+ ") && lineIndex < lines.length) {
      lineIndex++;
    }

    for (; lineIndex < lines.length; lineIndex++) {
      if (lines[lineIndex].startsWith("+ ")) {
        if (commandAccumulator.length > 0) {
          splitLogs.push(commandAccumulator);
        }
        commandAccumulator = lines[lineIndex] + '\n';
      } else {
        commandAccumulator += lines[lineIndex] + '\n';
      }
    }
    if (commandAccumulator.length > 0) {
      splitLogs.push(commandAccumulator);
    }
    return splitLogs;
  }

  private static pipelineForPipeline(remote: Remote, pipeline: Bitbucket.Schema.Pipeline): Pipeline {
    var name = undefined;
    var avatar = undefined;
    if (pipeline.creator) {
      name = pipeline.creator.display_name;
      if (pipeline.creator.links && pipeline.creator.links.avatar) {
        avatar = pipeline.creator.links.avatar.href;
      }
    }

    return {
      repository: CloudRepositoriesApi.toRepo(pipeline.repository!),
      remote: remote,
      build_number: pipeline.build_number!,
      created_on: pipeline.created_on!,
      creator_name: name,
      creator_avatar: avatar,
      completed_on: pipeline.completed_on,
      state: {
        name: pipeline.state!.name,
        type: pipeline.state!.type,
        result: PipelineApiImpl.resultForResult(pipeline.state!.result),
        stage: PipelineApiImpl.resultForResult(pipeline.state!.stage)
      },
      target: {
        ref_name: pipeline.target!.ref_name
      },
      duration_in_seconds: pipeline.duration_in_seconds,
      uuid: pipeline.uuid!,
    };
  }

  private static resultForResult(result?: any): PipelineResult | undefined {
    if (!result) {
      return undefined;
    }

    return {
      name: result.name,
      type: result.type
    };
  }

  private static pipelineStepForPipelineStep(step: any): PipelineStep {
    return {
      run_number: step.run_number,
      uuid: step.uuid,
      name: step.name,
      completed_on: step.completed_on,
      duration_in_seconds: step.duration_in_seconds,
      state: {
        name: step.state!.name,
        type: step.state!.type,
        result: PipelineApiImpl.resultForResult(step.state!.result),
        stage: PipelineApiImpl.resultForResult(step.state!.stage)
      },
      setup_commands: PipelineApiImpl.pipelineCommandsForPipelineCommands(step.setup_commands),
      teardown_commands: PipelineApiImpl.pipelineCommandsForPipelineCommands(step.teardown_commands),
      script_commands: PipelineApiImpl.pipelineCommandsForPipelineCommands(step.script_commands),
    };
  }

  private static pipelineCommandsForPipelineCommands(commands?: any[]): PipelineCommand[] {
    if (!commands) {
      return [];
    }
    return commands.map((command: any) => {
      return {
        action: command.action,
        command: command.command,
        name: command.name
      };
    });
  }
}
