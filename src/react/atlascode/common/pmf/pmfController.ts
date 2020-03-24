import { defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { createContext, useCallback, useMemo, useReducer } from 'react';
import { CommonAction, CommonActionType } from '../../../../lib/ipc/fromUI/common';
import { PMFData } from '../../../../lib/ipc/models/common';
import { PostMessageFunc } from '../../messagingApi';

export enum PMFDismissal {
    LATER = 'later',
    NEVER = 'never'
}
export interface PMFControllerApi {
    showPMFBanner: () => void;
    dismissPMFBanner: (howLong: PMFDismissal) => void;
    showPMFSurvey: () => void;
    submitPMFSurvey: (pmfData: PMFData) => void;
}

export const emptyPMFController: PMFControllerApi = {
    showPMFBanner: () => {},
    showPMFSurvey: () => {},
    submitPMFSurvey: (pmfData: PMFData) => {},
    dismissPMFBanner: (howLong: PMFDismissal) => {}
};

export type PMFState = {
    isPMFBannerOpen: boolean;
    isPMFSurveyOpen: boolean;
};

export const emptyPMFState: PMFState = {
    isPMFBannerOpen: false,
    isPMFSurveyOpen: false
};

export enum PMFActionType {
    ShowPMFBanner = 'showPMFBanner',
    ShowPMFSurvey = 'showPMFSurvey',
    SubmitPMFSurvey = 'submitPMFSurvey',
    DismissPMFBanner = 'dismissPMFBanner'
}

export type PMFAction =
    | ReducerAction<PMFActionType.ShowPMFBanner>
    | ReducerAction<PMFActionType.ShowPMFSurvey>
    | ReducerAction<PMFActionType.SubmitPMFSurvey>
    | ReducerAction<PMFActionType.DismissPMFBanner>;

function pmfReducer(state: PMFState, action: PMFAction): PMFState {
    switch (action.type) {
        case PMFActionType.ShowPMFBanner: {
            return {
                ...state,
                isPMFBannerOpen: true
            };
        }
        case PMFActionType.ShowPMFSurvey: {
            return {
                isPMFBannerOpen: false,
                isPMFSurveyOpen: true
            };
        }
        case PMFActionType.SubmitPMFSurvey: {
            return {
                isPMFBannerOpen: false,
                isPMFSurveyOpen: false
            };
        }
        case PMFActionType.DismissPMFBanner: {
            return {
                isPMFBannerOpen: false,
                isPMFSurveyOpen: false
            };
        }

        default:
            return defaultStateGuard(state, action);
    }
}

export function usePMFController(postMessageFunc: PostMessageFunc<CommonAction>): [PMFState, PMFControllerApi] {
    const [state, dispatch] = useReducer(pmfReducer, emptyPMFState);

    const showBanner = useCallback(() => {
        dispatch({ type: PMFActionType.ShowPMFBanner });
    }, []);

    const showSurvey = useCallback(() => {
        dispatch({ type: PMFActionType.ShowPMFSurvey });
        postMessageFunc({ type: CommonActionType.OpenPMFSurvey });
    }, [postMessageFunc]);

    const submitSurvey = useCallback(
        (pmfData: PMFData) => {
            dispatch({ type: PMFActionType.SubmitPMFSurvey });
            postMessageFunc({ type: CommonActionType.SubmitPMF, pmfData: pmfData });
        },
        [postMessageFunc]
    );

    const dismissBanner = useCallback(
        (howLong: PMFDismissal) => {
            dispatch({ type: PMFActionType.DismissPMFBanner });

            if (howLong === PMFDismissal.LATER) {
                postMessageFunc({ type: CommonActionType.DismissPMFLater });
            } else {
                postMessageFunc({ type: CommonActionType.DismissPMFNever });
            }
        },
        [postMessageFunc]
    );

    const controllerApi = useMemo<PMFControllerApi>((): PMFControllerApi => {
        return {
            showPMFBanner: showBanner,
            showPMFSurvey: showSurvey,
            submitPMFSurvey: submitSurvey,
            dismissPMFBanner: dismissBanner
        };
    }, [showBanner, showSurvey, submitSurvey, dismissBanner]);

    return [state, controllerApi];
}

export const PMFControllerContext = createContext(emptyPMFController);
