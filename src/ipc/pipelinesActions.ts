import { Action } from "./messaging";

export interface CopyPipelineLinkAction extends Action {
    action: 'copyPipelineLink';
    href: string;
}

export function isCopyPipelineLinkAction(a: Action): a is CopyPipelineLinkAction {
    return (<CopyPipelineLinkAction>a).href !== undefined;
}