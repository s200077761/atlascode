import { defaultActionGuard, defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import React, { useCallback, useMemo, useReducer } from 'react';
import { v4 } from 'uuid';
import { User } from '../../../bitbucket/model';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { PullRequestDetailsAction, PullRequestDetailsActionType } from '../../../lib/ipc/fromUI/pullRequestDetails';
import {
    emptyPullRequestDetailsInitMessage,
    FetchUsersResponseMessage,
    PullRequestDetailsInitMessage,
    PullRequestDetailsMessage,
    PullRequestDetailsMessageType,
    PullRequestDetailsResponse,
} from '../../../lib/ipc/toUI/pullRequestDetails';
import { ConnectionTimeout } from '../../../util/time';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface PullRequestDetailsControllerApi {
    postMessage: PostMessageFunc<PullRequestDetailsAction>;
    refresh: () => void;
    fetchUsers: (query: string, abortSignal?: AbortSignal) => Promise<User[]>;
    updateSummary: (text: string) => Promise<void>;
    updateTitle: (text: string) => Promise<void>;
}

export const emptyApi: PullRequestDetailsControllerApi = {
    postMessage: (s) => {
        return;
    },
    refresh: (): void => {
        return;
    },
    fetchUsers: async (query: string, abortSignal?: AbortSignal) => [],
    updateSummary: async (text: string) => {},
    updateTitle: async (text: string) => {},
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

    const [postMessage, postMessagePromise] = useMessagingApi<
        PullRequestDetailsAction,
        PullRequestDetailsMessage,
        PullRequestDetailsResponse
    >(onMessageHandler);

    const sendRefresh = useCallback((): void => {
        dispatch({ type: PullRequestDetailsUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const fetchUsers = useCallback(
        (query: string, abortSignal?: AbortSignal): Promise<User[]> => {
            return new Promise<User[]>((resolve, reject) => {
                (async () => {
                    try {
                        var abortKey: string = '';

                        if (abortSignal) {
                            abortKey = v4();

                            abortSignal.onabort = () => {
                                postMessage({
                                    type: CommonActionType.Cancel,
                                    abortKey: abortKey,
                                    reason: 'pull request fetchUsers cancelled by client',
                                });
                            };
                        }

                        const response = await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.FetchUsersRequest,
                                query: query,
                                abortKey: abortSignal ? abortKey : undefined,
                            },
                            PullRequestDetailsMessageType.FetchUsersResponse,
                            ConnectionTimeout
                        );
                        resolve((response as FetchUsersResponseMessage).users);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessage, postMessagePromise]
    );

    const updateSummary = useCallback(
        (text: string): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                (async () => {
                    try {
                        await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.UpdateSummary,
                                text: text,
                            },
                            PullRequestDetailsMessageType.UpdateSummaryResponse,
                            ConnectionTimeout
                        );
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise]
    );

    const updateTitle = useCallback(
        (text: string): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                (async () => {
                    try {
                        await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.UpdateTitle,
                                text: text,
                            },
                            PullRequestDetailsMessageType.UpdateTitleResponse,
                            ConnectionTimeout
                        );
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise]
    );

    const controllerApi = useMemo<PullRequestDetailsControllerApi>((): PullRequestDetailsControllerApi => {
        return {
            postMessage: postMessage,
            refresh: sendRefresh,
            fetchUsers: fetchUsers,
            updateSummary: updateSummary,
            updateTitle: updateTitle,
        };
    }, [postMessage, sendRefresh, fetchUsers, updateSummary, updateTitle]);

    return [state, controllerApi];
}
