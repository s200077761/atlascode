import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { clientForSite } from '../../../../bitbucket/bbUtils';
import { BitbucketIssue, User } from '../../../../bitbucket/model';
import { Container } from '../../../../container';
import { AnalyticsApi } from '../../../analyticsApi';
import { BitbucketIssueAction } from '../../../ipc/fromUI/bbIssue';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { BitbucketIssueMessage, BitbucketIssueMessageType } from '../../../ipc/toUI/bbIssue';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import { Logger } from '../../../logger';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { BitbucketIssueActionApi } from './bitbucketIssueActionApi';

export const id: string = 'bitbucketIssuePageV2';

export class BitbucketIssueWebviewController implements WebviewController<BitbucketIssue> {
    private _issue: BitbucketIssue;
    private _messagePoster: MessagePoster;
    private _api: BitbucketIssueActionApi;
    private _logger: Logger;
    private _analytics: AnalyticsApi;
    private _commonHandler: CommonActionMessageHandler;
    private _isRefreshing: boolean;
    private _participants: Map<string, User> = new Map();

    constructor(
        issue: BitbucketIssue,
        messagePoster: MessagePoster,
        api: BitbucketIssueActionApi,
        commonHandler: CommonActionMessageHandler,
        logger: Logger,
        analytics: AnalyticsApi
    ) {
        this._issue = issue;
        this._messagePoster = messagePoster;
        this._api = api;
        this._logger = logger;
        this._analytics = analytics;
        this._commonHandler = commonHandler;
    }

    public title(): string {
        return `Bitbucket issue #${this._issue.data.id}`;
    }

    private postMessage(message: BitbucketIssueMessage | CommonMessage) {
        this._messagePoster(message);
    }

    private async invalidate() {
        try {
            if (this._isRefreshing) {
                return;
            }

            this._isRefreshing = true;
            this.postMessage({
                type: BitbucketIssueMessageType.Init,
                issue: this._issue
            });

            const bbApi = await clientForSite(this._issue.site);
            const [, issueLatest, comments, changes] = await Promise.all([
                Container.bitbucketContext.currentUser(this._issue.site),
                bbApi.issues!.refetch(this._issue),
                bbApi.issues!.getComments(this._issue),
                bbApi.issues!.getChanges(this._issue)
            ]);

            this._issue = issueLatest;

            this._participants.clear();
            comments.data.forEach(c => this._participants.set(c.user.accountId, c.user));

            //@ts-ignore
            // replace comment with change data which contains additional details
            const updatedComments = comments.data.map(
                comment => changes.data.find(change => change.id! === comment.id!) || comment
            );

            this.postMessage({
                type: BitbucketIssueMessageType.Comments,
                comments: updatedComments
            });
        } catch (e) {
            let err = new Error(`error updating bitbucket issue: ${e}`);
            this._logger.error(err);
            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
        } finally {
            this._isRefreshing = false;
        }
    }

    public update(issue: BitbucketIssue) {
        this.postMessage({ type: BitbucketIssueMessageType.Init, issue });
    }

    public async onMessageReceived(msg: BitbucketIssueAction) {
        switch (msg.type) {
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this._logger.error(new Error(`error refreshing config: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refeshing config')
                    });
                }
                break;
            }
            case CommonActionType.SubmitFeedback: {
                //this._api.submitFeedback(msg.feedback, id);
                break;
            }
            case CommonActionType.ExternalLink:
            case CommonActionType.DismissPMFLater:
            case CommonActionType.DismissPMFNever:
            case CommonActionType.OpenPMFSurvey:
            case CommonActionType.SubmitPMF: {
                this._commonHandler.onMessageReceived(msg);
                console.log(this._api);
                console.log(this._analytics);
                break;
            }

            default: {
                defaultActionGuard(msg);
            }
        }
    }
}
