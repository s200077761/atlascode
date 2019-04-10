import { Action } from "./messaging";

export interface OpenPipelineBuildAction extends Action {
    action: 'openPipelineBuild';
    pipelineUUID: string | undefined;
}

export function isOpenPipelineBuild(a: Action): a is OpenPipelineBuildAction {
    return (<OpenPipelineBuildAction>a).pipelineUUID !== undefined;
}

export interface CopyPipelineLinkAction extends Action {
    action: 'copyPipelineLink';
    href: string;
}

export function isCopyPipelineLinkAction(a: Action): a is CopyPipelineLinkAction {
    return (<CopyPipelineLinkAction>a).href !== undefined;
}