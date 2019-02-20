import { Message } from "./messaging";
import { Pipeline, PipelineStep } from "../pipelines/model";

export interface PipelineData extends Message { }
export interface PipelineData extends Pipeline { }

export interface StepData extends PipelineStep { }
export interface StepMessageData extends Message {
    steps: StepData[];
}

export interface ViewPipelineData extends Message {
    pipelineData: any;
}
