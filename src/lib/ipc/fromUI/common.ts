import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { FeedbackData, PMFData } from '../models/common';

export enum CommonActionType {
    SubmitPMF = 'pmfSubmit',
    OpenPMFSurvey = 'pmfOpen',
    DismissPMFLater = 'pmfLater',
    DismissPMFNever = 'pmfNever',
    Refresh = 'refresh',
    SubmitFeedback = 'submitFeedback',
    ExternalLink = 'externalLink'
}

export type CommonAction =
    | ReducerAction<CommonActionType.SubmitPMF, PMFSubmitAction>
    | ReducerAction<CommonActionType.OpenPMFSurvey>
    | ReducerAction<CommonActionType.DismissPMFLater>
    | ReducerAction<CommonActionType.DismissPMFNever>
    | ReducerAction<CommonActionType.Refresh>
    | ReducerAction<CommonActionType.SubmitFeedback, SubmitFeedbackAction>
    | ReducerAction<CommonActionType.ExternalLink, ExternalLinkAction>;

export interface PMFSubmitAction {
    pmfData: PMFData;
}

export interface SubmitFeedbackAction {
    feedback: FeedbackData;
}

export interface ExternalLinkAction {
    linkId: string;
    url?: string;
}
