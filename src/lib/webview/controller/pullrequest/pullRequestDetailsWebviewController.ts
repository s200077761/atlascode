import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import Axios from 'axios';
import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import {
    ApprovalStatus,
    BitbucketIssue,
    BuildStatus,
    Commit,
    FileChange,
    FileDiff,
    MergeStrategy,
    PullRequest,
    User,
} from '../../../../bitbucket/model';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonAction, CommonActionType } from '../../../ipc/fromUI/common';
import { PullRequestDetailsAction, PullRequestDetailsActionType } from '../../../ipc/fromUI/pullRequestDetails';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import {
    emptyPullRequestDetailsInitMessage,
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
    private currentBranchName: string;
    private fileDiffs: FileDiff[];
    private diffsToChangesMap: Map<string, FileChange>;
    private buildStatuses: BuildStatus[];
    private mergeStrategies: MergeStrategy[];
    private mainIssue: MinimalIssue<DetailedSiteInfo> | BitbucketIssue | undefined;
    private relatedJiraIssues: MinimalIssue<DetailedSiteInfo>[];
    private relatedBitbucketIssues: BitbucketIssue[];

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
                ...emptyPullRequestDetailsInitMessage,
                type: PullRequestDetailsMessageType.Init,
                pr: this.pr,
                currentUser: await this.getCurrentUser(),
                currentBranchName: this.api.getCurrentBranchName(this.pr),
            });

            this.commits = await this.api.updateCommits(this.pr);
            this.postMessage({
                type: PullRequestDetailsMessageType.UpdateCommits,
                commits: this.commits,
            });

            this.buildStatuses = await this.api.updateBuildStatuses(this.pr);
            this.postMessage({
                type: PullRequestDetailsMessageType.UpdateBuildStatuses,
                buildStatuses: this.buildStatuses,
            });

            this.mergeStrategies = await this.api.updateMergeStrategies(this.pr);
            this.postMessage({
                type: PullRequestDetailsMessageType.UpdateMergeStrategies,
                mergeStrategies: this.mergeStrategies,
            });

            //TODO: Provide comments once you pull in comments PR
            //TODO: order matters! Try to optimize these calls later
            this.relatedJiraIssues = await this.api.fetchRelatedJiraIssues(this.pr, this.commits, []);
            this.postMessage({
                type: PullRequestDetailsMessageType.UpdateRelatedJiraIssues,
                relatedIssues: this.relatedJiraIssues,
            });

            this.relatedBitbucketIssues = await this.api.fetchRelatedBitbucketIssues(this.pr, this.commits, []);
            this.postMessage({
                type: PullRequestDetailsMessageType.UpdateRelatedBitbucketIssues,
                relatedIssues: this.relatedBitbucketIssues,
            });

            this.mainIssue = await this.api.fetchMainIssue(this.pr);
            this.postMessage({
                type: PullRequestDetailsMessageType.UpdateMainIssue,
                mainIssue: this.mainIssue,
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
        this.postMessage({
            type: PullRequestDetailsMessageType.Init,
            pr: this.pr,
            commits: this.commits,
            currentUser: await this.getCurrentUser(),
            currentBranchName: this.currentBranchName,
            fileDiffs: this.fileDiffs,
            mergeStrategies: this.mergeStrategies,
            buildStatuses: this.buildStatuses,
            mainIssue: this.mainIssue,
            relatedJiraIssues: this.relatedJiraIssues,
            relatedBitbucketIssues: this.relatedBitbucketIssues,
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

            case PullRequestDetailsActionType.Merge:
                try {
                    this.analytics.firePrMergeEvent(this.pr.site.details);
                    const updatedPullRequest = await this.api.merge(
                        this.pr,
                        msg.mergeStrategy,
                        msg.commitMessage,
                        msg.closeSourceBranch,
                        msg.issues
                    );
                    this.pr = { ...this.pr, ...updatedPullRequest };

                    //TODO: add comments argument
                    this.relatedJiraIssues = await this.api.fetchRelatedJiraIssues(this.pr, this.commits, []);
                    this.relatedBitbucketIssues = await this.api.fetchRelatedBitbucketIssues(this.pr, this.commits, []);
                    this.update();
                } catch (e) {
                    this.logger.error(new Error(`error merging pull request: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error merging pull request'),
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
