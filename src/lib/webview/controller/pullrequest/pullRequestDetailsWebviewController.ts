import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonAction, CommonActionType } from '../../../ipc/fromUI/common';
import { PullRequestDetailsAction } from '../../../ipc/fromUI/pullRequestDetails';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import { SectionChangeMessage } from '../../../ipc/toUI/config';
import { OnboardingMessage } from '../../../ipc/toUI/onboarding';
import { Logger } from '../../../logger';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { PullRequestDetailsActionApi } from './pullRequestDetailsActionApi';

export const id: string = 'atlascodeOnboardingV2';
export const title: string = 'Getting Started';

export class PullRequestDetailsWebviewController implements WebviewController<SectionChangeMessage> {
    private messagePoster: MessagePoster;
    private api: PullRequestDetailsActionApi;
    private logger: Logger;
    private analytics: AnalyticsApi;
    private pullRequestDetailsUrl: string;
    private commonHandler: CommonActionMessageHandler;

    constructor(
        messagePoster: MessagePoster,
        api: PullRequestDetailsActionApi,
        commonHandler: CommonActionMessageHandler,
        logger: Logger,
        analytics: AnalyticsApi,
        pullRequestDetailsUrl: string
    ) {
        this.messagePoster = messagePoster;
        this.api = api;
        this.logger = logger;
        this.analytics = analytics;
        this.pullRequestDetailsUrl = pullRequestDetailsUrl;
        this.commonHandler = commonHandler;

        //Temporarily logging these objects so compiler doesn't complain they're unused
        console.log(this.api);
        console.log(this.analytics);
        console.log(this.pullRequestDetailsUrl);
    }

    private postMessage(message: OnboardingMessage | CommonMessage) {
        this.messagePoster(message);
    }

    public title(): string {
        return title;
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
