import { defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { IssueKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, SelectFieldUI, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import React, { useCallback, useMemo, useReducer } from 'react';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { CreateIssueUIHelper } from '../../../lib/guipi/jira-issue-renderer/src';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { CreateJiraIssueAction, CreateJiraIssueActionType } from '../../../lib/ipc/fromUI/createJiraIssue';
import { KnownLinkID, WebViewID } from '../../../lib/ipc/models/common';
import {
    CreateIssueResponseMessage,
    CreateJiraIssueInitMessage,
    CreateJiraIssueMessage,
    CreateJiraIssueMessageType,
    CreateJiraIssueResponse,
    CreateJiraIssueUpdateMessage,
    emptyCreateJiraIssueInitMessage,
} from '../../../lib/ipc/toUI/createJiraIssue';
import { ConnectionTimeout } from '../../../util/time';
import { JiraIssueRenderer } from '../../guipi/jira-issue-renderer-mui/jiraIssueRenderer';
import { PostMessageFunc, useMessagingApi } from '../messagingApi';

const ProjectKey = 'project';

export interface CreateJiraIssueControllerApi {
    postMessage: PostMessageFunc<CreateJiraIssueAction>;
    refresh: () => void;
    openLink: (linkId: KnownLinkID) => void;
    createIssue: () => Promise<IssueKeyAndSite<DetailedSiteInfo>>;
    selectSite: (siteId: string) => Promise<void>;
    createIssueUIHelper?: CreateIssueUIHelper<DetailedSiteInfo, JSX.Element>;
}

export const emptyApi: CreateJiraIssueControllerApi = {
    postMessage: () => {},
    refresh: () => {},
    openLink: () => {},
    createIssue: () => Promise.reject('Not implemented'),
    selectSite: (siteId: string) => Promise.reject('Not implemented'),
    createIssueUIHelper: undefined,
};

export const CreateJiraIssueControllerContext = React.createContext(emptyApi);

type FieldState = {
    value?: any;
    isLoading?: boolean;
    options?: any[];
};

export interface CreateJiraIssueState extends CreateJiraIssueInitMessage {
    isSomethingLoading: boolean;
    isChangingProject: boolean;
    fieldState: { [key: string]: FieldState };
}

const emptyState: CreateJiraIssueState = {
    ...emptyCreateJiraIssueInitMessage,
    isSomethingLoading: false,
    isChangingProject: false,
    fieldState: {},
};

export enum CreateJiraIssueUIActionType {
    Init = 'init',
    FieldValueUpdate = 'fieldUpdate',
    FieldOptionUpdate = 'fieldOptionUpdate',
    Loading = 'loading',
    ChangingProject = 'changingProject',
    FieldStateUpdate = 'updatingField',
}

export type CreateJiraIssueUIAction =
    | ReducerAction<CreateJiraIssueUIActionType.Init, { data: CreateJiraIssueInitMessage }>
    | ReducerAction<CreateJiraIssueUIActionType.FieldValueUpdate, { fieldUI: FieldUI; value: any }>
    | ReducerAction<CreateJiraIssueUIActionType.FieldOptionUpdate, { fieldUI: FieldUI; options: any[] }>
    | ReducerAction<CreateJiraIssueUIActionType.Loading, {}>
    | ReducerAction<CreateJiraIssueUIActionType.ChangingProject, { fieldUI: FieldUI; value: any }>
    | ReducerAction<CreateJiraIssueUIActionType.FieldStateUpdate, { fieldUI: FieldUI; value: any }>; // XYZZY overlapping w/ FieldUpdate? Dumb name, regardless

export type JiraIssueChanges = { [key: string]: any };

// Handle state changes generated from within this file (and, at least for now, the reducer)
function reducer(state: CreateJiraIssueState, action: CreateJiraIssueUIAction): CreateJiraIssueState {
    switch (action.type) {
        // Proxied call from webviewController. Called more frequently than you'd think.
        case CreateJiraIssueUIActionType.Init: {
            const newFieldState = { ...state.fieldState };
            newFieldState[ProjectKey] = { value: action.data.project };

            const newstate = {
                ...state,
                ...action.data,
                fieldState: newFieldState,
                isSomethingLoading: false,
                isChangingProject: false,
                isErrorBannerOpen: false,
                pendingRequests: {},
                errorDetails: undefined,
            };
            return newstate;
        }
        // Called when a value is selected for a field.
        case CreateJiraIssueUIActionType.FieldValueUpdate: {
            // Update the issue type if that's what the user is doing.
            const selectedIssueType =
                action.fieldUI.key === 'issuetype' ? action.value : state.screenData.selectedIssueType;

            let newFieldState = { ...state.fieldState };
            newFieldState[action.fieldUI.key] = { value: action.value, isLoading: false, options: [] };

            const newState: CreateJiraIssueState = {
                ...state,
                fieldState: newFieldState,
                screenData: {
                    ...state.screenData,
                    selectedIssueType: selectedIssueType,
                },
            };

            return newState;
        }
        // Called after getting autocomplete response.
        case CreateJiraIssueUIActionType.FieldOptionUpdate: {
            let newFieldState = { ...state.fieldState };
            newFieldState[action.fieldUI.key] = {
                ...newFieldState[action.fieldUI.key],
                options: action.options,
                isLoading: false,
            };

            const newState: CreateJiraIssueState = {
                ...state,
                fieldState: newFieldState,
            };

            return newState;
        }
        case CreateJiraIssueUIActionType.Loading: {
            return { ...state, isSomethingLoading: true };
        }
        // Called after user selects a new project (but before its meta has been fetched)
        case CreateJiraIssueUIActionType.ChangingProject: {
            let newFieldState = { ...state.fieldState };
            newFieldState[action.fieldUI.key] = { value: action.value, isLoading: false };

            return { ...state, fieldState: newFieldState, isChangingProject: true };
        }
        // Called when the typed value in a field changes
        case CreateJiraIssueUIActionType.FieldStateUpdate: {
            const newFieldState = { ...state.fieldState };
            newFieldState[action.fieldUI.key] = { value: action.value, isLoading: true };
            return { ...state, fieldState: newFieldState };
        }
        default:
            return defaultStateGuard(state, action);
    }
}

export function useCreateJiraIssuePageController(): [CreateJiraIssueState, CreateJiraIssueControllerApi] {
    const [state, dispatch] = useReducer(reducer, emptyState);

    // Messages Received from the webviewController
    const onMessageHandler = useCallback((message: CreateJiraIssueMessage): void => {
        switch (message.type) {
            case CreateJiraIssueMessageType.Init: {
                dispatch({ type: CreateJiraIssueUIActionType.Init, data: message });
                break;
            }
            case CreateJiraIssueMessageType.Update: {
                const updateMessage = message as CreateJiraIssueUpdateMessage;
                dispatch({
                    type: CreateJiraIssueUIActionType.FieldOptionUpdate,
                    fieldUI: updateMessage.field,
                    options: updateMessage.options,
                });

                break;
            }
            default: {
                // uncomment this if another action is added above
                // defaultActionGuard(message);
            }
        }
    }, []);

    const [postMessage, postMessagePromise] = useMessagingApi<
        CreateJiraIssueAction,
        CreateJiraIssueMessage,
        CreateJiraIssueResponse
    >(onMessageHandler);

    const sendRefresh = useCallback((): void => {
        dispatch({ type: CreateJiraIssueUIActionType.Loading });
        postMessage({ type: CommonActionType.Refresh });
    }, [postMessage]);

    const openLink = useCallback(
        (linkId: KnownLinkID) =>
            postMessage({
                type: CommonActionType.ExternalLink,
                source: WebViewID.CreateJiraIssueWebview,
                linkId: linkId,
            }),
        [postMessage]
    );

    const renderer = React.useMemo(() => new JiraIssueRenderer(dispatch), [dispatch]);

    const delegate = {
        fieldDidUpdate: (field: FieldUI, value: any | undefined) => {
            if (field.key === ProjectKey) {
                dispatch({ type: CreateJiraIssueUIActionType.ChangingProject, fieldUI: field, value: value });
                postMessage({
                    type: CreateJiraIssueActionType.SelectProject,
                    site: state.site,
                    projectKey: value.key,
                });
            } else {
                dispatch({
                    type: CreateJiraIssueUIActionType.FieldValueUpdate,
                    fieldUI: field,
                    value: value,
                });
            }
        },
        autocompleteRequest: (field: SelectFieldUI, autoCompleteQuery: string) => {
            if (autoCompleteQuery === '') {
                return;
            }
            dispatch({
                type: CreateJiraIssueUIActionType.FieldStateUpdate,
                fieldUI: field,
                value: { key: '', name: autoCompleteQuery },
            });
            postMessage({
                type: CreateJiraIssueActionType.AutoCompleteQuery,
                site: state.site,
                field: field,
                autoCompleteQuery: autoCompleteQuery,
                url: field.autoCompleteUrl,
            });
        },
        isFieldWaiting: (field: FieldUI) => {
            if (field.key === ProjectKey && state.isChangingProject) {
                return true;
            }

            return !!state.fieldState[field.key]?.isLoading;
        },
        isFieldDisabled: (field: FieldUI) => {
            if (field.key === ProjectKey) {
                return false;
            }
            return state.isChangingProject;
        },
        valueForField: (field: FieldUI) => {
            if (field.valueType !== ValueType.Project) {
                return state.fieldState[field.key]?.value;
            }
            const stateValue = state.fieldState[field.key]?.value;
            if (!stateValue) {
                return stateValue; // Probably returning a partial match
            }

            if (stateValue.id) {
                // If there's a saved state with an id (an actual project)
                const fullOption = state.screenData.issueTypeUIs[
                    state.screenData.selectedIssueType.id
                ].selectFieldOptions[field.key].find((p) => p.id === stateValue.id);

                if (fullOption) {
                    return fullOption;
                }
            }

            return state.project;
        },
        optionsForField: (field: FieldUI) => {
            // Make sure that the typed value is included in the options
            const x = delegate.valueForField(field);
            let y = state.fieldState[field.key]?.options ?? [];
            if (x && x.key) {
                y = [x, ...y];
            }
            return y;
        },
    };

    const createIssueUIHelper = React.useMemo(() => new CreateIssueUIHelper(state.screenData, renderer, delegate), [
        renderer,
        state.screenData,
        delegate,
    ]);

    const createIssue = useCallback((): Promise<IssueKeyAndSite<DetailedSiteInfo>> => {
        return new Promise<IssueKeyAndSite<DetailedSiteInfo>>((resolve, reject) => {
            (async () => {
                try {
                    const response = await postMessagePromise(
                        {
                            type: CreateJiraIssueActionType.CreateIssueRequest,
                            site: state.site,
                            issueData: state.screenData.issueTypeUIs[state.screenData.selectedIssueType.id].fieldValues,
                        },
                        CreateJiraIssueMessageType.CreateIssueResponse,
                        ConnectionTimeout
                    );
                    resolve((response as CreateIssueResponseMessage).createdIssue);
                } catch (e) {
                    reject(e);
                }
            })();
        });
    }, [postMessagePromise, state.screenData.issueTypeUIs, state.screenData.selectedIssueType.id, state.site]);

    const selectSite = useCallback(
        (siteId: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                (async () => {
                    const newSite = state.sitesAvailable.find((s) => s.id === siteId);
                    if (newSite) {
                        dispatch({ type: CreateJiraIssueUIActionType.Loading });
                        await postMessagePromise(
                            {
                                type: CreateJiraIssueActionType.GetCreateMeta,
                                site: newSite,
                            },
                            CreateJiraIssueMessageType.Init,
                            ConnectionTimeout
                        );
                        resolve();
                    }
                })();
            });
        },
        [state.sitesAvailable, postMessagePromise]
    );

    const controllerApi = useMemo<CreateJiraIssueControllerApi>((): CreateJiraIssueControllerApi => {
        return {
            postMessage: postMessage,
            refresh: sendRefresh,
            openLink,
            createIssue,
            selectSite,
            createIssueUIHelper,
        };
    }, [openLink, postMessage, sendRefresh, createIssue, selectSite, createIssueUIHelper]);

    return [state, controllerApi];
}
