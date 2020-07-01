import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { PullRequest } from '../../../../bitbucket/model';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonAction, CommonActionType } from '../../../ipc/fromUI/common';
import { PullRequestDetailsAction } from '../../../ipc/fromUI/pullRequestDetails';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import { PullRequestDetailsMessage } from '../../../ipc/toUI/pullRequestDetails';
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
    private pullRequestDetailsUrl: string;
    private commonHandler: CommonActionMessageHandler;

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

        //Temporarily logging these objects so compiler doesn't complain they're unused
        console.log(this.api);
        console.log(this.analytics);
        console.log(this.pullRequestDetailsUrl);
    }

    private postMessage(message: PullRequestDetailsMessage | CommonMessage) {
        this.messagePoster(message);
    }

    public title(): string {
        return `Pull Request ${this.pr.data.id}`;
    }

    public screenDetails() {
        return { id: WebViewID.PullRequestDetailsWebview, site: undefined, product: undefined };
    }

    private async invalidate() {
        //Send data when the page is refreshed
        // this.postMessage({
        //     type: PullRequestDetailsMessageType.Init,
        // });
    }

    public update() {
        //Send initial data to page
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
