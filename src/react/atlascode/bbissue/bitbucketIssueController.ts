import { defaultActionGuard, defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import React, { useCallback, useMemo, useReducer } from 'react';
import { Comment } from '../../../bitbucket/model';
import { BitbucketIssueAction, BitbucketIssueActionType } from '../../../lib/ipc/fromUI/bbIssue';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { KnownLinkID } from '../../../lib/ipc/models/common';
import {
    BitbucketIssueChangesMessage,
    BitbucketIssueCommentsMessage,
    BitbucketIssueInitMessage,
    BitbucketIssueMessage,
    BitbucketIssueMessageType,
    emptyBitbucketIssueCommentsMessage,
    emptyBitbucketIssueInitMessage,
    UpdateStatusResponseMessage
} from '../../../lib/ipc/toUI/bbIssue';
import { ConnectionTimeout } from '../../../util/time';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface BitbucketIssueControllerApi {
    postMessage: PostMessageFunc<BitbucketIssueAction>;
    refresh: () => void;
    openLink: (linkId: KnownLinkID) => void;
    updateStatus: (status: string) => Promise<string>;
    applyChange: (issue: { state: string; [k: string]: any }) => void;
}

export const emptyApi: BitbucketIssueControllerApi = {
    postMessage: s => {
        return;
    },
    refresh: (): void => {
        return;
    },
    openLink: linkId => {
        return;
    },
    updateStatus: async (status: string) => status,
    applyChange: (issue: { state: string; [k: string]: any }) => {}
};

export const BitbucketIssueControllerContext = React.createContext(emptyApi);

export interface BitbucketIssueState extends BitbucketIssueInitMessage {
    comments: Comment[];
    isSomethingLoading: boolean;
}

const emptyState: BitbucketIssueState = {
    ...emptyBitbucketIssueInitMessage,
    ...emptyBitbucketIssueCommentsMessage,
    isSomethingLoading: false
};

export enum BitbucketIssueUIActionType {
    Init = 'init',
    InitComments = 'initComments',
    UpdateComments = 'updateComments',
    LocalChange = 'localChange',
    Loading = 'loading'
}

export type BitbucketIssueUIAction =
    | ReducerAction<BitbucketIssueUIActionType.Init, { data: BitbucketIssueInitMessage }>
    | ReducerAction<BitbucketIssueUIActionType.InitComments, { data: BitbucketIssueCommentsMessage }>
    | ReducerAction<BitbucketIssueUIActionType.UpdateComments, { data: BitbucketIssueCommentsMessage }>
    | ReducerAction<BitbucketIssueUIActionType.LocalChange, { data: BitbucketIssueChangesMessage }>
    | ReducerAction<BitbucketIssueUIActionType.Loading, {}>;

export type BitbucketIssueChanges = { [key: string]: any };

function reducer(state: BitbucketIssueState, action: BitbucketIssueUIAction): BitbucketIssueState {
    switch (action.type) {
        case BitbucketIssueUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                errorDetails: undefined
            };
            return newstate;
        }
        case BitbucketIssueUIActionType.InitComments: {
            return {
                ...state,
                comments: action.data.comments,
                isSomethingLoading: false
            };
        }
        case BitbucketIssueUIActionType.UpdateComments: {
            return {
                ...state,
                comments: [...state.comments, ...action.data.comments],
                isSomethingLoading: false
            };
        }
        case BitbucketIssueUIActionType.LocalChange: {
            return {
                ...state,
                issue: {
                    ...state.issue,
                    data: { ...state.issue.data, ...action.data }
                },
                isSomethingLoading: false
            };
        }
        case BitbucketIssueUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }
        default:
            return defaultStateGuard(state, action);
    }
}

export function useBitbucketIssueController(): [BitbucketIssueState, BitbucketIssueControllerApi] {
    const [state, dispatch] = useReducer(reducer, emptyState);

    const onMessageHandler = useCallback((message: BitbucketIssueMessage): void => {
        switch (message.type) {
            case BitbucketIssueMessageType.Init: {
                dispatch({ type: BitbucketIssueUIActionType.Init, data: message });
                break;
            }
            case BitbucketIssueMessageType.InitComments: {
                dispatch({ type: BitbucketIssueUIActionType.InitComments, data: message });
                break;
            }
            case BitbucketIssueMessageType.UpdateComments: {
                dispatch({ type: BitbucketIssueUIActionType.UpdateComments, data: message });
                break;
            }
            default: {
                defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage, postMessagePromise] = useMessagingApi<BitbucketIssueAction, BitbucketIssueMessage, {}>(
        onMessageHandler
    );

    const updateStatus = useCallback(
        (status: string): Promise<string> => {
            return new Promise<string>((resolve, reject) => {
                (async () => {
                    try {
                        const response = await postMessagePromise(
                            { type: BitbucketIssueActionType.UpdateStatusRequest, status: status },
                            BitbucketIssueMessageType.UpdateStatusResponse,
                            ConnectionTimeout
                        );
                        resolve((response as UpdateStatusResponseMessage).status);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise]
    );

    const applyChange = useCallback(
        (issue: { state: string; [k: string]: any }) => {
            dispatch({
                type: BitbucketIssueUIActionType.LocalChange,
                data: issue
            });
        },
        [dispatch]
    );

    const sendRefresh = useCallback((): void => {
        dispatch({ type: BitbucketIssueUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) => postMessage({ type: CommonActionType.ExternalLink, linkId: linkId }),
        [postMessage]
    );

    const controllerApi = useMemo<BitbucketIssueControllerApi>((): BitbucketIssueControllerApi => {
        return {
            postMessage: postMessage,
            refresh: sendRefresh,
            openLink,
            updateStatus,
            applyChange
        };
    }, [openLink, postMessage, sendRefresh, updateStatus, applyChange]);

    return [state, controllerApi];
}
