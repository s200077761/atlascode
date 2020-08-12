import { defaultActionGuard, defaultStateGuard, ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import React, { useCallback, useMemo, useReducer } from 'react';
import { v4 } from 'uuid';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import {
    ApprovalStatus,
    BitbucketIssue,
    BitbucketSite,
    Comment,
    FileDiff,
    MergeStrategy,
    Reviewer,
    User,
} from '../../../bitbucket/model';
import { CommonActionType } from '../../../lib/ipc/fromUI/common';
import { PullRequestDetailsAction, PullRequestDetailsActionType } from '../../../lib/ipc/fromUI/pullRequestDetails';
import {
    emptyPullRequestDetailsInitMessage,
    FetchUsersResponseMessage,
    PullRequestDetailsApprovalMessage,
    PullRequestDetailsBuildStatusesMessage,
    PullRequestDetailsCheckoutBranchMessage,
    PullRequestDetailsCommentsMessage,
    PullRequestDetailsCommitsMessage,
    PullRequestDetailsFileDiffsMessage,
    PullRequestDetailsInitMessage,
    PullRequestDetailsMergeStrategiesMessage,
    PullRequestDetailsMessage,
    PullRequestDetailsMessageType,
    PullRequestDetailsRelatedBitbucketIssuesMessage,
    PullRequestDetailsRelatedJiraIssuesMessage,
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
    updateSummary: (text: string) => void;
    updateTitle: (text: string) => void;
    updateReviewers: (newReviewers: User[]) => void;
    updateApprovalStatus: (status: ApprovalStatus) => void;
    checkoutBranch: () => void;
    postComment: (rawText: string, parentId?: string) => Promise<void>;
    deleteComment: (comment: Comment) => void;

    openDiff: (fileDiff: FileDiff) => void;
    merge: (
        mergeStrategy: MergeStrategy,
        commitMessage: string,
        closeSourceBranch: boolean,
        issues: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[]
    ) => void;
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
    updateReviewers: (newReviewers: User[]) => {},
    updateApprovalStatus: (status: ApprovalStatus) => {},
    checkoutBranch: () => {},
    postComment: async (rawText: string, parentId?: string) => {},
    deleteComment: (comment: Comment) => {},
    openDiff: (fileDiff: FileDiff) => {},
    merge: (
        mergeStrategy: MergeStrategy,
        commitMessage: string,
        closeSourceBranch: boolean,
        issues: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[]
    ) => {},
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
    UpdateCommits = 'updateCommits',
    UpdateReviewers = 'updateReviewers',
    UpdateApprovalStatus = 'updateApprovalStatus',
    CheckoutBranch = 'checkoutBranch',
    UpdateComments = 'updateComments',
    AddComment = 'addComment',
    UpdateFileDiffs = 'updateFileDiffs',
    UpdateBuildStatuses = 'updateBuildStatuses',
    UpdateMergeStrategies = 'updateMergeStrategies',
    UpdateRelatedJiraIssues = 'updateRelatedJiraIssues',
    UpdateRelatedBitbucketIssues = 'updateRelatedBitbucketIssues',
}

export type PullRequestDetailsUIAction =
    | ReducerAction<PullRequestDetailsUIActionType.Init, { data: PullRequestDetailsInitMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateSummary, { data: PullRequestDetailsSummaryMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateTitle, { data: PullRequestDetailsTitleMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateCommits, { data: PullRequestDetailsCommitsMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateReviewers, { data: PullRequestDetailsReviewersMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateApprovalStatus, { data: PullRequestDetailsApprovalMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.CheckoutBranch, { data: PullRequestDetailsCheckoutBranchMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateComments, { data: PullRequestDetailsCommentsMessage }>
    | ReducerAction<PullRequestDetailsUIActionType.UpdateFileDiffs, { data: PullRequestDetailsFileDiffsMessage }>
    | ReducerAction<
          PullRequestDetailsUIActionType.UpdateBuildStatuses,
          { data: PullRequestDetailsBuildStatusesMessage }
      >
    | ReducerAction<
          PullRequestDetailsUIActionType.UpdateMergeStrategies,
          { data: PullRequestDetailsMergeStrategiesMessage }
      >
    | ReducerAction<
          PullRequestDetailsUIActionType.UpdateRelatedJiraIssues,
          { data: PullRequestDetailsRelatedJiraIssuesMessage }
      >
    | ReducerAction<
          PullRequestDetailsUIActionType.UpdateRelatedBitbucketIssues,
          { data: PullRequestDetailsRelatedBitbucketIssuesMessage }
      >
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
                isSomethingLoading: false,
            };
        }
        case PullRequestDetailsUIActionType.UpdateTitle: {
            return {
                ...state,
                pr: { ...state.pr, data: { ...state.pr.data, title: action.data.title } },
                isSomethingLoading: false,
            };
        }
        case PullRequestDetailsUIActionType.UpdateReviewers: {
            return {
                ...state,
                pr: { ...state.pr, data: { ...state.pr.data, participants: action.data.reviewers } },
                isSomethingLoading: false,
            };
        }
        case PullRequestDetailsUIActionType.UpdateApprovalStatus: {
            //Update the status of the current user and leave the rest unchanged
            const updatedParticipants = state.pr.data.participants.map((participant: Reviewer) => {
                return participant.accountId === state.currentUser.accountId
                    ? {
                          ...participant,
                          status: action.data.status,
                      }
                    : participant;
            });

            return {
                ...state,
                pr: { ...state.pr, data: { ...state.pr.data, participants: updatedParticipants } },
                isSomethingLoading: false,
            };
        }
        case PullRequestDetailsUIActionType.CheckoutBranch: {
            return {
                ...state,
                currentBranchName: action.data.branchName,
                isSomethingLoading: false,
            };
        }
        case PullRequestDetailsUIActionType.UpdateCommits: {
            return { ...state, commits: action.data.commits, isSomethingLoading: false };
        }
        case PullRequestDetailsUIActionType.UpdateComments: {
            return { ...state, comments: action.data.comments, isSomethingLoading: false };
        }
        case PullRequestDetailsUIActionType.UpdateCommits: {
            return { ...state, commits: action.data.commits };
        }
        case PullRequestDetailsUIActionType.UpdateFileDiffs: {
            return { ...state, fileDiffs: action.data.fileDiffs };
        }
        case PullRequestDetailsUIActionType.UpdateBuildStatuses: {
            return { ...state, buildStatuses: action.data.buildStatuses };
        }
        case PullRequestDetailsUIActionType.UpdateMergeStrategies: {
            return { ...state, mergeStrategies: action.data.mergeStrategies };
        }
        case PullRequestDetailsUIActionType.UpdateRelatedJiraIssues: {
            return { ...state, relatedJiraIssues: action.data.relatedIssues };
        }
        case PullRequestDetailsUIActionType.UpdateRelatedBitbucketIssues: {
            return { ...state, relatedBitbucketIssues: action.data.relatedIssues };
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
            case PullRequestDetailsMessageType.UpdateCommits: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateCommits, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateReviewers: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateReviewers, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateApprovalStatus: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateApprovalStatus, data: message });
                break;
            }
            case PullRequestDetailsMessageType.CheckoutBranch: {
                dispatch({ type: PullRequestDetailsUIActionType.CheckoutBranch, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateComments: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateComments, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateFileDiffs: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateFileDiffs, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateBuildStatuses: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateBuildStatuses, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateMergeStrategies: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateMergeStrategies, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateRelatedJiraIssues: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateRelatedJiraIssues, data: message });
                break;
            }
            case PullRequestDetailsMessageType.UpdateRelatedBitbucketIssues: {
                dispatch({ type: PullRequestDetailsUIActionType.UpdateRelatedBitbucketIssues, data: message });
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
        (text: string) => {
            dispatch({ type: PullRequestDetailsUIActionType.Loading });
            postMessage({ type: PullRequestDetailsActionType.UpdateSummaryRequest, text: text });
        },
        [postMessage]
    );

    const updateTitle = useCallback(
        (text: string) => {
            dispatch({ type: PullRequestDetailsUIActionType.Loading });
            postMessage({ type: PullRequestDetailsActionType.UpdateTitleRequest, text: text });
        },
        [postMessage]
    );

    const updateReviewers = useCallback(
        (newReviewers: User[]) => {
            dispatch({ type: PullRequestDetailsUIActionType.Loading });
            postMessage({ type: PullRequestDetailsActionType.UpdateReviewers, reviewers: newReviewers });
        },
        [postMessage]
    );

    const updateApprovalStatus = useCallback(
        (status: ApprovalStatus) => {
            dispatch({ type: PullRequestDetailsUIActionType.Loading });
            postMessage({ type: PullRequestDetailsActionType.UpdateApprovalStatus, status: status });
        },
        [postMessage]
    );

    const checkoutBranch = useCallback(() => {
        dispatch({ type: PullRequestDetailsUIActionType.Loading });
        postMessage({ type: PullRequestDetailsActionType.CheckoutBranch });
    }, [postMessage]);

    const postComment = useCallback(
        (rawText: string, parentId?: string): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                (async () => {
                    try {
                        await postMessagePromise(
                            {
                                type: PullRequestDetailsActionType.PostComment,
                                rawText: rawText,
                                parentId: parentId,
                            },
                            PullRequestDetailsMessageType.PostCommentResponse,
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

    const deleteComment = useCallback(
        (comment: Comment) => {
            dispatch({ type: PullRequestDetailsUIActionType.Loading });
            postMessage({ type: PullRequestDetailsActionType.DeleteComment, comment: comment });
        },
        [postMessage]
    );

    const openDiff = useCallback(
        (fileDiff: FileDiff) => postMessage({ type: PullRequestDetailsActionType.OpenDiffRequest, fileDiff: fileDiff }),
        [postMessage]
    );

    const merge = useCallback(
        (
            mergeStrategy: MergeStrategy,
            commitMessage: string,
            closeSourceBranch: boolean,
            issues: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[]
        ) => {
            dispatch({ type: PullRequestDetailsUIActionType.Loading });
            postMessage({
                type: PullRequestDetailsActionType.Merge,
                mergeStrategy: mergeStrategy,
                commitMessage: commitMessage,
                closeSourceBranch: closeSourceBranch,
                issues: issues,
            });
        },
        [postMessage]
    );

    const controllerApi = useMemo<PullRequestDetailsControllerApi>((): PullRequestDetailsControllerApi => {
        return {
            postMessage: postMessage,
            refresh: sendRefresh,
            fetchUsers: fetchUsers,
            updateSummary: updateSummary,
            updateTitle: updateTitle,
            updateReviewers: updateReviewers,
            updateApprovalStatus: updateApprovalStatus,
            checkoutBranch: checkoutBranch,
            postComment: postComment,
            deleteComment: deleteComment,
            openDiff: openDiff,
            merge: merge,
        };
    }, [
        postMessage,
        sendRefresh,
        fetchUsers,
        updateSummary,
        updateTitle,
        updateReviewers,
        updateApprovalStatus,
        checkoutBranch,
        postComment,
        deleteComment,
        openDiff,
        merge,
    ]);

    return [state, controllerApi];
}
