import { defaultActionGuard, defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import React, { useCallback, useMemo, useReducer } from 'react';
import { v4 } from 'uuid';
import { BitbucketSite, User } from '../../../bitbucket/model';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { PullRequestDetailsAction, PullRequestDetailsActionType } from '../../../lib/ipc/fromUI/pullRequestDetails';
import {
    emptyPullRequestDetailsInitMessage,
    FetchUsersResponseMessage,
    PullRequestDetailsInitMessage,
    PullRequestDetailsMessage,
    PullRequestDetailsMessageType,
    PullRequestDetailsResponse,
    PullRequestDetailsReviewersMessage,
    PullRequestDetailsSummaryMessage,
    PullRequestDetailsTitleMessage,
} from '../../../lib/ipc/toUI/pullRequestDetails';
import { ConnectionTimeout } from '../../../util/time';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface PullRequestDetailsControllerApi {
    postMessage: PostMessageFunc<PullRequestDetailsAction>;
    refresh: () => void;
    fetchUsers: (site: BitbucketSite, query: string, abortSignal?: AbortSignal) => Promise<User[]>;
    updateSummary: (text: string) => Promise<void>;
    updateTitle: (text: string) => Promise<void>;
    updateReviewers: (newReviewers: User[]) => Promise<void>;
}

export const emptyApi: PullRequestDetailsControllerApi = {
    postMessage: (s) => {
        return;
    },
    refresh: (): void => {
        return;
    },
    fetchUsers: async (site: BitbucketSite, query: string, abortSignal?: AbortSignal) => [],
    updateSummary: async (text: string) => {
        return;
    },
    updateTitle: async (text: string) => {},
    updateReviewers: async (newReviewers: User[]) => {},
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
    UpdateSummary = 'updateSummary',
    UpdateTitle = 'updateTitle',
    UpdateReviewers = 'updateReviewers',
}

export type PullRequestDetailsUIAction =
    | ReducerAction<PullRequestDetailsUIActionType.Init, { data: PullRequestDetailsInitMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateSummary, { data: PullRequestDetailsSummaryMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateTitle, { data: PullRequestDetailsTitleMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateReviewers, { data: PullRequestDetailsReviewersMessage }>
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
        case PullRequestDetailsUIActionType.UpdateSummary: {
            return {
                ...state,
                pr: {
                    ...state.pr,
                    data: {
                        ...state.pr.data,
                        htmlSummary: action.data.htmlSummary,
                        rawSummary: action.data.rawSummary,
                    },
                },
            };
        }
        case PullRequestDetailsUIActionType.UpdateTitle: {
            return { ...state, pr: { ...state.pr, data: { ...state.pr.data, title: action.data.title } } };
        }
        case PullRequestDetailsUIActionType.UpdateReviewers: {
            return { ...state, pr: { ...state.pr, data: { ...state.pr.data, participants: action.data.reviewers } } };
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
            case PullRequestDetailsMessageType.UpdateSummary: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateSummary, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateTitle: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateTitle, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateReviewers: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateReviewers, data: message });
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
        (site: BitbucketSite, query: string, abortSignal?: AbortSignal): Promise<User[]> => {
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
                                site: site,
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
                                type: PullRequestDetailsActionType.UpdateSummaryRequest,
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
                                type: PullRequestDetailsActionType.UpdateTitleRequest,
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

    const updateReviewers = useCallback(
        (newReviewers: User[]): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                (async () => {
                    try {
                        await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.UpdateReviewers,
                                reviewers: newReviewers,
                            },
                            PullRequestDetailsMessageType.UpdateReviewersResponse,
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
            updateReviewers: updateReviewers,
        };
    }, [postMessage, sendRefresh, fetchUsers, updateSummary, updateTitle, updateReviewers]);

    return [state, controllerApi];
}
