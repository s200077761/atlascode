import { Repository, Remote } from "../typings/git";
import { Container } from "../container";
import { Pipeline, PipelineResult, PipelineStep, PipelineCommand, PipelineTarget, PaginatedPipelines } from "./model";
import { parseGitUrl, urlForRemote, siteDetailsForRemote, firstBitbucketRemote } from "../bitbucket/bbUtils";
import { bbAPIConnectivityError } from "../constants";
import { CloudRepositoriesApi } from "../bitbucket/bitbucket-cloud/repositories";
import { Client, ClientError } from "../bitbucket/httpClient";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { AxiosResponse } from "axios";

export class PipelineApiImpl {
  private client: Client;

  constructor(site: DetailedSiteInfo, token: string, agent: any) {
    this.client = new Client(
      site.baseApiUrl,
      `Bearer ${token}`,
      agent,
      async (response: AxiosResponse): Promise<Error> => {
        let errString = 'Unknown error';
        const errJson = await response.data;

        if (errJson.error && errJson.error.message) {
          errString = errJson.error.message;
        } else {
          errString = errJson;
        }

        return new ClientError(response.statusText, errString);
      }
    );
  }

  async getRecentActivity(repository: Repository): Promise<Pipeline[]> {
    const remote = firstBitbucketRemote(repository);
    const accessToken = await this.getValidPipelinesAccessToken(remote);
    return this.getSinglepagePipelines(remote, accessToken);
  }

  async startPipeline(repository: Repository, branchName: string): Promise<Pipeline> {
    const remote = firstBitbucketRemote(repository);
    let parsed = parseGitUrl(urlForRemote(remote));

    const { data } = await this.client.post(
      `/repositories/${parsed.owner}/${parsed.name}/pipelines/`,
      {
        target: {
          ref_type: "branch",
          type: "pipeline_ref_target",
          ref_name: branchName
        }
      }
    );

    return data;
  }

  async getPipeline(repository: Repository, uuid: string): Promise<Pipeline> {
    const remote = firstBitbucketRemote(repository);
    let parsed = parseGitUrl(urlForRemote(remote));

    const { data } = await this.client.get(
      `/repositories/${parsed.owner}/${parsed.name}/pipelines/${uuid}`
    );

    return this.cleanPipelineData(remote, data);
  }

  async getSteps(repository: Repository, uuid: string): Promise<PipelineStep[]> {
    const remote = firstBitbucketRemote(repository);
    let parsed = parseGitUrl(urlForRemote(remote));

    const { data } = await this.client.get(
      `/repositories/${parsed.owner}/${parsed.name}/pipelines/${uuid}/steps/`
    );

    return data.values!.map((s: any) => PipelineApiImpl.pipelineStepForPipelineStep(s));
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
    branchName: string
  ): Promise<Pipeline[]> {
    return this.getSinglepagePipelines(remote, { 'target.branch': branchName });
  }

  // A simplified version of getPaginatedPipelines() which assumes you just want some pipelines 
  async getSinglepagePipelines(
    remote: Remote,
    query?: any
  ): Promise<Pipeline[]> {
    const firstPaginatedPage = await this.getPaginatedPipelines(remote, query);
    return firstPaginatedPage.values;
  }

  // Returns a paginated pipeline which contains information like page length and page number
  async getPaginatedPipelines(
    remote: Remote,
    query?: any
  ): Promise<PaginatedPipelines> {
    // TODO: [VSCODE-502] use site info and convert to async await with try/catch
    let parsed = parseGitUrl(urlForRemote(remote));
    const response = await this.client.get(
      `/repositories/${parsed.owner}/${parsed.name}/pipelines/`,
      {
        ...query,
        sort: '-created_on'
      }
    );

    //Take the response and clean it up; in particular, clean up the pipelines it sends back
    const responseBody = response.data;
    let cleanedPipelines: Pipeline[] = [];
    if (responseBody.values) {
      cleanedPipelines = responseBody.values.map((pipeline: any) => this.cleanPipelineData(remote, pipeline));
    }

    let cleanedPaginatedPipelines: PaginatedPipelines = {
      pagelen: responseBody.pagelen,
      page: responseBody.page,
      size: responseBody.size,
      values: cleanedPipelines
    };
    return cleanedPaginatedPipelines;
  }

  async getPipelineLog(remote: Remote,
    pipelineUuid: string,
    stepUuid: string): Promise<string[]> {
    let parsed = parseGitUrl(urlForRemote(remote));

    const { data } = await this.client.getOctetStream(
      `/repositories/${parsed.owner}/${parsed.name}/pipelines/${pipelineUuid}/steps/${stepUuid}/log`
    );

    return PipelineApiImpl.splitLogs(data.toString());
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

  cleanPipelineData(remote: Remote, pipeline: any): Pipeline {
    var name = undefined;
    var avatar = undefined;
    if (pipeline.creator) {
      name = pipeline.creator.display_name;
      if (pipeline.creator.links && pipeline.creator.links.avatar) {
        avatar = pipeline.creator.links.avatar.href;
      }
    }
    //Sometimes a pipeline runs on a commit rather than a branch, so ref_name is undefined
    let target: PipelineTarget = {
      ref_name: pipeline.target!.ref_name, 
      selector: pipeline.target!.selector, 
      triggerName: pipeline.trigger!.name
    };

    const cleanedPipeline: Pipeline = {
      remote: remote,
      repository: CloudRepositoriesApi.toRepo(pipeline.repository!),
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
      target: target,
      duration_in_seconds: pipeline.duration_in_seconds,
      uuid: pipeline.uuid!
    };
    return cleanedPipeline;
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
