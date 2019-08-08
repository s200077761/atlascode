import { Repo } from "../bitbucket/model";
import { Remote } from "../typings/git";

export interface PaginatedPipelines {
    values: Pipeline[];
    page: number;
    size: number;
    pagelen: number;
}

export interface Pipeline {
    repository: Repo;
    remote: Remote;
    build_number: number;
    created_on: string;
    creator_name?: string;
    creator_avatar?: string;
    state: PipelineState;
    uuid: string;
    target: PipelineTarget;
    completed_on?: string;
    duration_in_seconds?: number;
}

export enum Status {
    Pending,
    InProgress,
    Paused,
    Stopped,
    Successful,
    Error,
    Failed,
    Unknown,
}

export interface PipelineState {
    name: string;
    type: string;
    result?: PipelineResult;
    stage?: PipelineStage;
}

export interface PipelineResult {
    name: string;
    type: string;
}

export interface PipelineStage {
    name: string;
    type: string;
}

export interface PipelineSelector{
    pattern?: string;
    type: string;
}

export interface PipelineTarget {
    ref_name?: string;
    selector?: PipelineSelector;
    triggerName: string; 
}

export interface PipelineStep {
    run_number: number;
    uuid: string;
    name?: string;
    completed_on?: string;
    setup_commands: PipelineCommand[];
    script_commands: PipelineCommand[];
    teardown_commands: PipelineCommand[];
    duration_in_seconds: number;
    state?: PipelineState;
}

export interface PipelineCommand {
    action?: string;
    command: string;
    name: string;
    logs?: string;
}

export function statusForState(state: PipelineState): Status {
    if (!state) {
        return Status.Unknown;
    }
    switch (state.type) {
        case "pipeline_state_completed":
        // fall through
        case "pipeline_step_state_completed":
            return statusForResult(state.result!);
        case "pipeline_state_in_progress":
        // fall through
        case "pipeline_step_state_in_progress":
            return statusForStage(state.stage);
        case "pipeline_state_pending":
            return Status.Pending;
        case "pipeline_step_state_pending":
            return statusForStage(state.stage);
        default:
            return Status.Unknown;
    }
}

function statusForResult(result: PipelineResult): Status {
    switch (result.type) {
        case "pipeline_state_completed_successful":
        // fall through
        case "pipeline_step_state_completed_successful":
            return Status.Successful;
        case "pipeline_state_completed_error":
        // fall through
        case "pipeline_step_state_completed_error":
            return Status.Error;
        case "pipeline_state_completed_failed":
        // fall through
        case "pipeline_step_state_completed_failed":
            return Status.Failed;
        case "pipeline_state_completed_stopped":
        // fall through
        case "pipeline_step_state_completed_stopped":
            return Status.Stopped;
        default:
            return Status.Unknown;
    }
}

function statusForStage(stage?: PipelineStage): Status {
    if (!stage) {
        return Status.InProgress;
    }
    switch (stage.type) {
        case "pipeline_state_in_progress_running":
            return Status.InProgress;
        case "pipeline_step_state_pending_pending":
        case "pipeline_step_state_in_progress_pending":
            return Status.Pending;
        case "pipeline_step_state_pending_paused":
        case "pipeline_state_in_progress_paused":
            return Status.Paused;
        case "pipeline_step_state_pending_halted":
        case "pipeline_state_in_progress_halted":
            return Status.Stopped;
        default:
            return Status.Unknown;
    }
}
