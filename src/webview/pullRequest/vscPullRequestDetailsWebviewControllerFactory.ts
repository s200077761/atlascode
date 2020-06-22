import { Disposable, Uri } from 'vscode';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { SectionChangeMessage } from '../../lib/ipc/toUI/config';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { id } from '../../lib/webview/controller/onboarding/onboardingWebviewController';
import { PullRequestDetailsActionApi } from '../../lib/webview/controller/pullrequest/pullRequestDetailsActionApi';
import { PullRequestDetailsWebviewController } from '../../lib/webview/controller/pullrequest/pullRequestDetailsWebviewController';
import { Logger } from '../../logger';
import { iconSet, Resources } from '../../resources';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class VSCPullRequestDetailsWebviewControllerFactory
    implements VSCWebviewControllerFactory<SectionChangeMessage> {
    private api: PullRequestDetailsActionApi;
    private commonHandler: CommonActionMessageHandler;
    private analytics: AnalyticsApi;
    private pullRequestDetailsUrl: string;

    constructor(
        api: PullRequestDetailsActionApi,
        commonHandler: CommonActionMessageHandler,
        analytics: AnalyticsApi,
        prDetailsUrl: string
    ) {
        this.api = api;
        this.commonHandler = commonHandler;
        this.analytics = analytics;
        this.pullRequestDetailsUrl = prDetailsUrl;
    }

    public tabIcon(): Uri | { light: Uri; dark: Uri } | undefined {
        return Resources.icons.get(iconSet.BITBUCKETICON);
    }

    public uiWebsocketPort(): number {
        return UIWSPort.PullRequestDetailsPage;
    }

    public createController(
        postMessage: PostMessageFunc
    ): [PullRequestDetailsWebviewController, Disposable | undefined];

    public createController(postMessage: PostMessageFunc): PullRequestDetailsWebviewController;

    public createController(
        postMessage: PostMessageFunc
    ): PullRequestDetailsWebviewController | [PullRequestDetailsWebviewController, Disposable | undefined] {
        const controller = new PullRequestDetailsWebviewController(
            postMessage,
            this.api,
            this.commonHandler,
            Logger.Instance,
            this.analytics,
            this.pullRequestDetailsUrl
        );

        return [controller, undefined];
    }

    public webviewHtml(baseUri: Uri, cspSource: string): string {
        return getHtmlForView(baseUri, cspSource, id);
    }
}
