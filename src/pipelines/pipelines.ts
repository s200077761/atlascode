import { CloudRepositoriesApi } from '../bitbucket/bitbucket-cloud/repositories';
import { HTTPClient } from '../bitbucket/httpClient';
import { BitbucketSite } from '../bitbucket/model';
import { Logger } from '../logger';
import {
    PaginatedPipelines,
    Pipeline,
    PipelineCommand,
    PipelineCommitTarget,
    PipelinePullRequestTarget,
    PipelineReferenceTarget,
    PipelineReferenceType,
    PipelineResult,
    PipelineSelector,
    PipelineSelectorType,
    PipelineStep,
    PipelineTarget,
    PipelineTargetType
} from './model';

export class PipelineApiImpl {
    constructor(private client: HTTPClient) {}

    async getRecentActivity(site: BitbucketSite): Promise<Pipeline[]> {
        return this.getSinglepagePipelines(site);
    }

    async getPipeline(site: BitbucketSite, uuid: string): Promise<Pipeline> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/pipelines/${uuid}`);

        return this.cleanPipelineData(site, data);
    }

    async triggerPipeline(site: BitbucketSite, target: any): Promise<Pipeline> {
        const { ownerSlug, repoSlug } = site;
        const { data } = await this.client.post(`/repositories/${ownerSlug}/${repoSlug}/pipelines/`, {
            target: target
        });
        return this.cleanPipelineData(site, data);
    }

    async getSteps(site: BitbucketSite, uuid: string): Promise<PipelineStep[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/pipelines/${uuid}/steps/`);

        return data.values!.map((s: any) => PipelineApiImpl.pipelineStepForPipelineStep(s));
    }

    async getStepLog(site: BitbucketSite, pipelineUuid: string, stepUuid: string): Promise<string[]> {
        return this.getPipelineLog(site, pipelineUuid, stepUuid);
    }

    async getListForRemote(site: BitbucketSite, branchName: string): Promise<Pipeline[]> {
        return this.getSinglepagePipelines(site, { 'target.branch': branchName });
    }

    // A simplified version of getPaginatedPipelines() which assumes you just want some pipelines
    async getSinglepagePipelines(site: BitbucketSite, query?: any): Promise<Pipeline[]> {
        const firstPaginatedPage = await this.getPaginatedPipelines(site, query);
        return firstPaginatedPage.values;
    }

    // Returns a paginated pipeline which contains information like page length and page number
    async getPaginatedPipelines(site: BitbucketSite, query?: any): Promise<PaginatedPipelines> {
        const { ownerSlug, repoSlug } = site;

        const { data: responseBody } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/pipelines/`, {
            ...query,
            sort: '-created_on'
        });

        //Take the response and clean it up; in particular, clean up the pipelines it sends back
        let cleanedPipelines: Pipeline[] = [];
        if (responseBody.values) {
            cleanedPipelines = responseBody.values.map((pipeline: any) => this.cleanPipelineData(site, pipeline));
        }

        let cleanedPaginatedPipelines: PaginatedPipelines = {
            pagelen: responseBody.pagelen,
            page: responseBody.page,
            size: responseBody.size,
            values: cleanedPipelines
        };
        return cleanedPaginatedPipelines;
    }

    async getPipelineLog(site: BitbucketSite, pipelineUuid: string, stepUuid: string): Promise<string[]> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.getOctetStream(
            `/repositories/${ownerSlug}/${repoSlug}/pipelines/${pipelineUuid}/steps/${stepUuid}/log`
        );

        return PipelineApiImpl.splitLogs(data.toString());
    }

    private static splitLogs(logText: string): string[] {
        const lines = logText.split('\n');
        var commandAccumulator = '';
        var lineIndex = 0;
        const splitLogs: string[] = [];

        // Trim any log output preceding the first command
        while (!lines[lineIndex].startsWith('+ ') && lineIndex < lines.length) {
            lineIndex++;
        }

        for (; lineIndex < lines.length; lineIndex++) {
            if (lines[lineIndex].startsWith('+ ')) {
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

    readSelectorType(type: string): PipelineSelectorType {
        switch (type) {
            case PipelineSelectorType.Bookmark:
                return PipelineSelectorType.Bookmark;
            case PipelineSelectorType.Branch:
                return PipelineSelectorType.Branch;
            case PipelineSelectorType.Custom:
                return PipelineSelectorType.Custom;
            case PipelineSelectorType.PullRequests:
                return PipelineSelectorType.PullRequests;
            case PipelineSelectorType.Tag:
                return PipelineSelectorType.Tag;
        }
        return PipelineSelectorType.Default;
    }

    readTargetType(targetType: string): PipelineTargetType | undefined {
        switch (targetType) {
            case PipelineTargetType.Commit:
                return PipelineTargetType.Commit;
            case PipelineTargetType.PullRequest:
                return PipelineTargetType.PullRequest;
            case PipelineTargetType.Reference:
                return PipelineTargetType.Reference;
        }
        Logger.debug(`Couldn't identify PipelineTargetType ${targetType}`);
        return undefined;
    }

    readReferenceType(referenceType: string): PipelineReferenceType | undefined {
        switch (referenceType) {
            case PipelineReferenceType.AnnotatedTag:
                return PipelineReferenceType.AnnotatedTag;
            case PipelineReferenceType.Bookmark:
                return PipelineReferenceType.Bookmark;
            case PipelineReferenceType.Branch:
                return PipelineReferenceType.Branch;
            case PipelineReferenceType.NamedBranch:
                return PipelineReferenceType.NamedBranch;
            case PipelineReferenceType.Tag:
                return PipelineReferenceType.Tag;
        }
        Logger.debug(`Couldn't identify PipelineReferenceType ${referenceType}`);
        return undefined;
    }

    readSelector(selector: any): PipelineSelector {
        return {
            pattern: selector.pattern,
            type: this.readSelectorType(selector.type)
        } as PipelineSelector;
    }

    readTarget(target: any): PipelineTarget {
        const partialTarget = {
            type: this.readTargetType(target.type),
            ref_name: target.ref_name,
            selector: this.readSelector(target.selector),
            branchName: target.branch,
            commit: target.commit
        };
        switch (partialTarget.type) {
            case PipelineTargetType.Commit:
                return partialTarget as PipelineCommitTarget;
            case PipelineTargetType.PullRequest:
                return {
                    ...partialTarget,
                    ...{
                        source: target.source,
                        destination: target.destination,
                        destination_revision: target.destination_revision,
                        pull_request_id: target.pull_request_id
                    }
                } as PipelinePullRequestTarget;
            case PipelineTargetType.Reference:
                return {
                    ...partialTarget,
                    ...{
                        ref_name: target.ref_name,
                        ref_type: this.readReferenceType(target.ref_type)
                    }
                } as PipelineReferenceTarget;
        }
        Logger.debug(`Failed to read pipeline target ${JSON.stringify(target)}`);
        return target;
    }

    cleanPipelineData(site: BitbucketSite, pipeline: any): Pipeline {
        var name = undefined;
        var avatar = undefined;
        if (pipeline.creator) {
            name = pipeline.creator.display_name;
            if (pipeline.creator.links && pipeline.creator.links.avatar) {
                avatar = pipeline.creator.links.avatar.href;
            }
        }

        let target: PipelineTarget = this.readTarget(pipeline.target);

        const cleanedPipeline: Pipeline = {
            site: site,
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
            triggerName: pipeline.trigger.name,
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
            script_commands: PipelineApiImpl.pipelineCommandsForPipelineCommands(step.script_commands)
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
