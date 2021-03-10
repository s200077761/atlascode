import { Disposable, Uri } from 'vscode';
import { ProductJira } from '../../atlclients/authInfo';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { CreateJiraIssueInitMessage } from '../../lib/ipc/toUI/createJiraIssue';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { CreateJiraIssueActionApi } from '../../lib/webview/controller/issue/createJiraIssueActionApi';
import { CreateJiraIssueWebviewController } from '../../lib/webview/controller/issue/createJiraIssueWebviewController';
import { Logger } from '../../logger';
import { iconSet, Resources } from '../../resources';
import { SiteManager } from '../../siteManager';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class VSCCreateJiraIssueWebviewControllerFactory
    implements VSCWebviewControllerFactory<CreateJiraIssueInitMessage> {
    constructor(
        private api: CreateJiraIssueActionApi,
        private commonHandler: CommonActionMessageHandler,
        private siteManager: SiteManager,
        private analytics: AnalyticsApi
    ) {}

    public tabIcon(): Uri | { light: Uri; dark: Uri } | undefined {
        return Resources.icons.get(iconSet.JIRAICON);
    }

    public uiWebsocketPort(): number {
        return UIWSPort.CreateJiraIssuePage;
    }

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: CreateJiraIssueInitMessage
    ): [CreateJiraIssueWebviewController, Disposable | undefined];

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: CreateJiraIssueInitMessage
    ): CreateJiraIssueWebviewController;

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: CreateJiraIssueInitMessage
    ): CreateJiraIssueWebviewController | [CreateJiraIssueWebviewController, Disposable | undefined] {
        const controller = new CreateJiraIssueWebviewController(
            postMessage,
            this.api,
            this.commonHandler,
            this.siteManager.getSitesAvailable(ProductJira),
            Logger.Instance,
            this.analytics,
            factoryData
        );

        return [controller, undefined];
    }

    public webviewHtml(extensionPath: string, baseUri: Uri, cspSource: string): string {
        return getHtmlForView(extensionPath, baseUri, cspSource, 'createIssueScreenV2');
    }
}
