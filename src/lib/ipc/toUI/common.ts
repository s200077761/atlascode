import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

export enum CommonMessageType {
    Error = 'error',
    OnlineStatus = 'onlineStatus',
    PMFStatus = 'pmfStatus'
}

export type CommonMessage =
    | ReducerAction<CommonMessageType.Error, HostErrorMessage>
    | ReducerAction<CommonMessageType.OnlineStatus, OnlineStatusMessage>
    | ReducerAction<CommonMessageType.PMFStatus, PMFMessage>;

export interface HostErrorMessage {
    reason: string;
}

export interface OnlineStatusMessage {
    isOnline: boolean;
}

export interface PMFMessage {
    showPMF: boolean;
}
