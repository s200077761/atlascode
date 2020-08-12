import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import Axios from 'axios';
import { ApprovalStatus, Comment, Commit, FileChange, FileDiff, PullRequest, User } from '../../../../bitbucket/model';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonAction, CommonActionType } from '../../../ipc/fromUI/common';
import { PullRequestDetailsAction, PullRequestDetailsActionType } from '../../../ipc/fromUI/pullRequestDetails';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import {
    PullRequestDetailsMessage,
    PullRequestDetailsMessageType,
    PullRequestDetailsResponse,
} from '../../../ipc/toUI/pullRequestDetails';
import { Logger } from '../../../logger';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { PullRequestDetailsActionApi } from './pullRequestDetailsActionApi';

export const title: string = 'Pull Request'; //TODO: Needs the pull request ID as well...

export class PullRequestDetailsWebviewController implements WebviewController<PullRequest> {
    private pr: PullRequest;
    private commits: Commit[] = [];
    private messagePoster: MessagePoster;
    private api: PullRequestDetailsActionApi;
    private logger: Logger;
    private analytics: AnalyticsApi;
    private commonHandler: CommonActionMessageHandler;
    private isRefreshing: boolean;
    private pageComments: Comment[];
    private inlineComments: Comment[];
    private fileDiffs: FileDiff[];
    private diffsToChangesMap: Map<string, FileChange>;

    constructor(
        pr: PullRequest,
        messagePoster: MessagePoster,
        api: PullRequestDetailsActionApi,
        commonHandler: CommonActionMessageHandler,
        logger: Logger,
        analytics: AnalyticsApi
    ) {
        this.pr = pr;
        this.messagePoster = messagePoster;
        this.api = api;
        this.logger = logger;
        this.analytics = analytics;
        this.commonHandler = commonHandler;
    }

    private postMessage(message: PullRequestDetailsMessage | PullRequestDetailsResponse | CommonMessage) {
        this.messagePoster(message);
    }

    private async getCurrentUser(): Promise<User> {
        return await this.api.getCurrentUser(this.pr);
    }

    public title(): string {
        return `Pull Request ${this.pr.data.id}`;
    }

    public screenDetails() {
        return { id: WebViewID.PullRequestDetailsWebview, site: undefined, product: undefined };
    }

    private splitComments(allComments: Comment[]) {
        this.pageComments = [];
        this.inlineComments = [];
        allComments.forEach((comment) =>
            comment.inline ? this.inlineComments.push(comment) : this.pageComments.push(comment)
        );
    }

    private async invalidate() {
        try {
            if (this.isRefreshing) {
                return;
            }
            this.isRefreshing = true;
            this.pr = await this.api.getPR(this.pr);
            this.postMessage({
                type: PullRequestDetailsMessageType.Init,
                pr: this.pr,
                commits: [],
                currentUser: await this.getCurrentUser(),
                currentBranchName: this.api.getCurrentBranchName(this.pr),
                comments: [],
                fileDiffs: [],
            });

            //TODO: run these promises concurrently
            this.commits = await this.api.updateCommits(this.pr);
            this.postMessage({
                type: PullRequestDetailsMessageType.UpdateCommits,
                commits: this.commits,
            });

            const allComments = await this.api.getComments(this.pr);
            this.splitComments(allComments);

            this.postMessage({
                type: PullRequestDetailsMessageType.UpdateComments,
                comments: this.pageComments,
            });

            const diffsAndChanges = await this.api.getFileDiffs(this.pr);
            this.diffsToChangesMap = diffsAndChanges.diffsToChangesMap;
            this.fileDiffs = diffsAndChanges.fileDiffs;
            this.postMessage({
                type: PullRequestDetailsMessageType.UpdateFileDiffs,
                fileDiffs: this.fileDiffs,
            });
        } catch (e) {
            let err = new Error(`error updating pull request: ${e}`);
            this.logger.error(err);
            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
        } finally {
            this.isRefreshing = false;
        }
    }

    public async update() {
        this.invalidate();
    }

    public async onMessageReceived(msg: PullRequestDetailsAction | CommonAction) {
        switch (msg.type) {
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this.logger.error(new Error(`error refreshing pull request: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refreshing pull request'),
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.FetchUsersRequest: {
                try {
                    const users = await this.api.fetchUsers(msg.site, msg.query, msg.abortKey);
                    this.postMessage({
                        type: PullRequestDetailsMessageType.FetchUsersResponse,
                        users: users,
                    });
                } catch (e) {
                    if (Axios.isCancel(e)) {
                        this.logger.warn(formatError(e));
                    } else {
                        this.logger.error(new Error(`error fetching users: ${e}`));
                        this.postMessage({
                            type: CommonMessageType.Error,
                            reason: formatError(e, 'Error fetching users'),
                        });
                    }
                }
                break;
            }

            case PullRequestDetailsActionType.UpdateReviewers: {
                try {
                    const reviewers = await this.api.updateReviewers(this.pr, msg.reviewers);
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateReviewers,
                        reviewers: reviewers,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error updating reviewers: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error fetching users'),
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.UpdateSummaryRequest: {
                try {
                    const pr = await this.api.updateSummary(this.pr, msg.text);
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateSummary,
                        rawSummary: pr.data.rawSummary,
                        htmlSummary: pr.data.htmlSummary,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error fetching users: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error fetching users'),
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.UpdateTitleRequest: {
                try {
                    const pr = await this.api.updateTitle(this.pr, msg.text);
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateTitle,
                        title: pr.data.title,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error fetching users: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error fetching users'),
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.UpdateApprovalStatus: {
                try {
                    const status: ApprovalStatus = await this.api.updateApprovalStatus(this.pr, msg.status);
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateApprovalStatus,
                        status: status,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error updating approval status: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error updating approval status'),
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.CheckoutBranch: {
                try {
                    this.analytics.firePrCheckoutEvent(this.pr.site.details);
                    const newBranchName = await this.api.checkout(this.pr);
                    this.postMessage({
                        type: PullRequestDetailsMessageType.CheckoutBranch,
                        branchName: newBranchName,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error checking out pull request branch: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error checking out pull request'),
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.PostComment: {
                try {
                    this.analytics.firePrCommentEvent(this.pr.site.details);
                    this.pageComments = await this.api.postComment(
                        this.pageComments,
                        this.pr,
                        msg.rawText,
                        msg.parentId
                    );
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateComments,
                        comments: this.pageComments,
                    });
                    this.postMessage({
                        type: PullRequestDetailsMessageType.PostCommentResponse,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error adding comment: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error adding comment'),
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.DeleteComment: {
                try {
                    const allComments = await this.api.deleteComment(this.pr, msg.comment);
                    this.splitComments(allComments);

                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateComments,
                        comments: this.pageComments,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error deleting comment: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error deleting comment'),
                    });
                }
                break;
            }
            case PullRequestDetailsActionType.OpenDiffRequest:
                try {
                    //Find a matching FileChange for the corresponding FileDiff. This will not be necessary once these two types are unified.
                    const fileChange = this.diffsToChangesMap.get(msg.fileDiff.file);
                    if (fileChange) {
                        await this.api.openDiffViewForFile(this.pr, fileChange);
                    } else {
                        throw Error('No corresponding FileChange object for FileDiff');
                    }
                } catch (e) {
                    this.logger.error(new Error(`error opening diff: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error opening diff'),
                    });
                }
                break;

            case CommonActionType.OpenJiraIssue:
            case CommonActionType.SubmitFeedback:
            case CommonActionType.ExternalLink:
            case CommonActionType.DismissPMFLater:
            case CommonActionType.DismissPMFNever:
            case CommonActionType.OpenPMFSurvey:
            case CommonActionType.Cancel:
            case CommonActionType.SubmitPMF: {
                this.commonHandler.onMessageReceived(msg);
                break;
            }
            default: {
                defaultActionGuard(msg);
            }
        }
    }
}
