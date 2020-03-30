import { defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import React, { useCallback, useMemo, useReducer } from 'react';
import { BitbucketIssueAction } from '../../../lib/ipc/fromUI/bbIssue';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { KnownLinkID } from '../../../lib/ipc/models/common';
import {
    BitbucketIssueInitMessage,
    BitbucketIssueMessage,
    BitbucketIssueMessageType,
    emptyBitbucketIssueInitMessage
} from '../../../lib/ipc/toUI/bbIssue';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface BitbucketIssueControllerApi {
    postMessage: PostMessageFunc<BitbucketIssueAction>;
    refresh: () => void;
    openLink: (linkId: KnownLinkID) => void;
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
    }
};

export const BitbucketIssueControllerContext = React.createContext(emptyApi);

export interface BitbucketIssueState extends BitbucketIssueInitMessage {
    isSomethingLoading: boolean;
}

const emptyState: BitbucketIssueState = {
    ...emptyBitbucketIssueInitMessage,
    isSomethingLoading: false
};

export enum BitbucketIssueUIActionType {
    Init = 'init',
    Loading = 'loading'
}

export type BitbucketIssueUIAction =
    | ReducerAction<BitbucketIssueUIActionType.Init, { data: BitbucketIssueInitMessage }>
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
            default: {
                // defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage] = useMessagingApi<BitbucketIssueAction, BitbucketIssueMessage, {}>(onMessageHandler);

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
            openLink: openLink
        };
    }, [openLink, postMessage, sendRefresh]);

    return [state, controllerApi];
}
