import { defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { Transition } from '@atlassianlabs/jira-pi-common-models';
import React, { useCallback, useMemo, useReducer } from 'react';
import { WorkspaceRepo } from '../../../bitbucket/model';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { StartWorkAction, StartWorkActionType } from '../../../lib/ipc/fromUI/startWork';
import { KnownLinkID } from '../../../lib/ipc/models/common';
import {
    emptyStartWorkInitMessage,
    StartWorkInitMessage,
    StartWorkMessage,
    StartWorkMessageType,
    StartWorkResponse,
    StartWorkResponseMessage,
} from '../../../lib/ipc/toUI/startWork';
import { Branch } from '../../../typings/git';
import { ConnectionTimeout } from '../../../util/time';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

export interface StartWorkControllerApi {
    postMessage: PostMessageFunc<StartWorkAction>;
    refresh: () => void;
    openLink: (linkId: KnownLinkID) => void;
    startWork: (
        transitionIssueEnabled: boolean,
        transition: Transition,
        branchSetupEnabled: boolean,
        wsRepo: WorkspaceRepo,
        sourceBranch: Branch,
        targetBranch: string,
        upstream: string
    ) => Promise<{ transistionStatus?: string; branch?: string; upstream?: string }>;
    closePage: () => void;
    openJiraIssue: () => void;
}

export const emptyApi: StartWorkControllerApi = {
    postMessage: () => {},
    refresh: () => {},
    openLink: () => {},
    startWork: async () => ({}),
    closePage: () => {},
    openJiraIssue: () => {},
};

export const StartWorkControllerContext = React.createContext(emptyApi);

export interface StartWorkState extends StartWorkInitMessage {
    isSomethingLoading: boolean;
}

const emptyState: StartWorkState = {
    ...emptyStartWorkInitMessage,
    isSomethingLoading: false,
};

export enum StartWorkUIActionType {
    Init = 'init',
    Loading = 'loading',
}

export type StartWorkUIAction =
    | ReducerAction<StartWorkUIActionType.Init, { data: StartWorkInitMessage }>
    | ReducerAction<StartWorkUIActionType.Loading, {}>;

export type StartWorkChanges = { [key: string]: any };

function reducer(state: StartWorkState, action: StartWorkUIAction): StartWorkState {
    switch (action.type) {
        case StartWorkUIActionType.Init: {
            const newstate = {
                ...state,
                ...action.data,
                isSomethingLoading: false,
                isErrorBannerOpen: false,
                errorDetails: undefined,
            };
            return newstate;
        }
        case StartWorkUIActionType.Loading: {
            return { ...state, ...{ isSomethingLoading: true } };
        }
        default:
            return defaultStateGuard(state, action);
    }
}

export function useStartWorkController(): [StartWorkState, StartWorkControllerApi] {
    const [state, dispatch] = useReducer(reducer, emptyState);

    const onMessageHandler = useCallback((message: StartWorkMessage): void => {
        switch (message.type) {
            case StartWorkMessageType.Init: {
                dispatch({ type: StartWorkUIActionType.Init, data: message });
                break;
            }
            default: {
                // uncomment this if another action is added above
                // defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage, postMessagePromise] = useMessagingApi<StartWorkAction, StartWorkMessage, StartWorkResponse>(
        onMessageHandler
    );

    const startWork = useCallback(
        (
            transitionIssueEnabled: boolean,
            transition: Transition,
            branchSetupEnabled: boolean,
            wsRepo: WorkspaceRepo,
            sourceBranch: Branch,
            targetBranch: string,
            upstream: string
        ): Promise<StartWorkResponseMessage> => {
            return new Promise<StartWorkResponseMessage>((resolve, reject) => {
                (async () => {
                    try {
                        const response = await postMessagePromise(
                            {
                                type: StartWorkActionType.StartRequest,
                                transitionIssueEnabled,
                                transition,
                                wsRepo,
                                branchSetupEnabled,
                                sourceBranch,
                                targetBranch,
                                upstream,
                            },
                            StartWorkMessageType.StartWorkResponse,
                            ConnectionTimeout
                        );
                        resolve(response as StartWorkResponseMessage);
                    } catch (e) {
                        reject(e);
                    }
                })();
            });
        },
        [postMessagePromise]
    );

    const closePage = useCallback((): void => postMessage({ type: StartWorkActionType.ClosePage }), [postMessage]);

    const sendRefresh = useCallback((): void => {
        dispatch({ type: StartWorkUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) => postMessage({ type: CommonActionType.ExternalLink, linkId: linkId }),
        [postMessage]
    );

    const openJiraIssue = useCallback(
        () => postMessage({ type: CommonActionType.OpenJiraIssue, issueOrKey: state.issue }),
        [postMessage, state.issue]
    );

    const controllerApi = useMemo<StartWorkControllerApi>((): StartWorkControllerApi => {
        return {
            postMessage: postMessage,
            refresh: sendRefresh,
            openJiraIssue,
            openLink,
            startWork,
            closePage,
        };
    }, [openJiraIssue, openLink, postMessage, sendRefresh, startWork, closePage]);

    return [state, controllerApi];
}
