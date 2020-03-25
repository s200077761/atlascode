import { defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { createContext, useCallback, useMemo, useReducer } from 'react';

export interface ErrorControllerApi {
    showError: (details: any) => void;
    dismissError: () => void;
}

export const emptyErrorController: ErrorControllerApi = {
    showError: (details: any) => {},
    dismissError: () => {}
};

export type ErrorState = {
    isErrorBannerOpen: boolean;
    errorDetails: any;
};

export const emptyErrorState: ErrorState = {
    isErrorBannerOpen: false,
    errorDetails: undefined
};

export enum ErrorActionType {
    ShowError = 'showError',
    DismissError = 'dismissError'
}

export type ErrorAction =
    | ReducerAction<ErrorActionType.ShowError, { data: any }>
    | ReducerAction<ErrorActionType.DismissError>;

function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
    switch (action.type) {
        case ErrorActionType.ShowError: {
            return {
                isErrorBannerOpen: true,
                errorDetails: action.data
            };
        }
        case ErrorActionType.DismissError: {
            return {
                isErrorBannerOpen: false,
                errorDetails: undefined
            };
        }

        default:
            return defaultStateGuard(state, action);
    }
}

export function useErrorController(): [ErrorState, ErrorControllerApi] {
    const [state, dispatch] = useReducer(errorReducer, emptyErrorState);

    const showError = useCallback((details: any) => {
        dispatch({ type: ErrorActionType.ShowError, data: details });
    }, []);

    const dismissError = useCallback(() => {
        dispatch({ type: ErrorActionType.DismissError });
    }, []);

    const controllerApi = useMemo<ErrorControllerApi>((): ErrorControllerApi => {
        return {
            showError: showError,
            dismissError: dismissError
        };
    }, [showError, dismissError]);

    return [state, controllerApi];
}

export const ErrorControllerContext = createContext(emptyErrorController);
export const ErrorStateContext = createContext(emptyErrorState);
