import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import Axios from 'axios';
import { ApprovalStatus, PullRequest, User } from '../../../../bitbucket/model';
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
    private messagePoster: MessagePoster;
    private api: PullRequestDetailsActionApi;
    private logger: Logger;
    private analytics: AnalyticsApi;
    private commonHandler: CommonActionMessageHandler;
    private isRefreshing: boolean;
    private currentBranchName: string;

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
                currentUser: await this.getCurrentUser(),
                currentBranchName: this.api.getCurrentBranchName(this.pr),
            });

            this.isRefreshing = false;
        } catch (e) {
            let err = new Error(`error updating pull request: ${e}`);
            this.logger.error(err);
            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
        } finally {
            this.isRefreshing = false;
        }
    }

    public async update() {
        this.postMessage({
            type: PullRequestDetailsMessageType.Init,
            pr: this.pr,
            currentUser: await this.getCurrentUser(),
            currentBranchName: this.currentBranchName,
        });
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
                        type: PullRequestDetailsMessageType.UpdateSummaryResponse,
                    });
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
                        type: PullRequestDetailsMessageType.UpdateTitleResponse,
                    });
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
