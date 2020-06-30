import { defaultActionGuard, defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import React, { useCallback, useMemo, useReducer } from 'react';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { PullRequestDetailsAction } from '../../../lib/ipc/fromUI/pullRequestDetails';
import {
    emptyPullRequestDetailsInitMessage,
    PullRequestDetailsInitMessage,
    PullRequestDetailsMessage,
    PullRequestDetailsMessageType,
    PullRequestDetailsResponse,
} from '../../../lib/ipc/toUI/pullRequestDetails';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface PullRequestDetailsControllerApi {
    postMessage: PostMessageFunc<PullRequestDetailsAction>;
    refresh: () => void;
}

export const emptyApi: PullRequestDetailsControllerApi = {
    postMessage: (s) => {
        return;
    },
    refresh: (): void => {
        return;
    },
};

export const PullRequestDetailsControllerContext = React.createContext(emptyApi);

export interface PullRequestDetailsState extends PullRequestDetailsInitMessage {
    isSomethingLoading: boolean;
}

const emptyState: PullRequestDetailsState = {
    ...emptyPullRequestDetailsInitMessage,
    isSomethingLoading: false,
};

export enum PullRequestDetailsUIActionType {
    Init = 'init',
    ConfigChange = 'configChange',
    Loading = 'loading',
}

export type PullRequestDetailsUIAction =
    | ReducerAction<PullRequestDetailsUIActionType.Init, { data: PullRequestDetailsInitMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.Loading>;

function pullRequestDetailsReducer(
    state: PullRequestDetailsState,
    action: PullRequestDetailsUIAction
): PullRequestDetailsState {
    switch (action.type) {
        case PullRequestDetailsUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                errorDetails: undefined,
            };
            return newstate;
        }
        case PullRequestDetailsUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }

        default:
            return defaultStateGuard(state, action);
    }
}

export function usePullRequestDetailsController(): [PullRequestDetailsState, PullRequestDetailsControllerApi] {
    const [state, dispatch] = useReducer(pullRequestDetailsReducer, emptyState);

    const onMessageHandler = useCallback((message: PullRequestDetailsMessage): void => {
        switch (message.type) {
            case PullRequestDetailsMessageType.Init: {
                dispatch({ type: PullRequestDetailsUIActionType.Init, data: message });
                break;
            }
            case PullRequestDetailsMessageType.Update: {
                //FILL THIS IN
                break;
            }

            default: {
                defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage] = useMessagingApi<
        PullRequestDetailsAction,
        PullRequestDetailsMessage,
        PullRequestDetailsResponse
    >(onMessageHandler);

    const sendRefresh = useCallback((): void => {
        dispatch({ type: PullRequestDetailsUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const controllerApi = useMemo<PullRequestDetailsControllerApi>((): PullRequestDetailsControllerApi => {
        return {
            postMessage: postMessage,
            refresh: sendRefresh,
        };
    }, [postMessage, sendRefresh]);

    return [state, controllerApi];
}
