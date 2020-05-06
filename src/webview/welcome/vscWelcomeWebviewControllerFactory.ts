import { Disposable } from 'vscode';
import { Container } from '../../container';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { WelcomeInitMessage } from '../../lib/ipc/toUI/welcome';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { WelcomeActionApi } from '../../lib/webview/controller/welcome/welcomeActionApi';
import { WelcomeWebviewController } from '../../lib/webview/controller/welcome/welcomeWebviewController';
import { Logger } from '../../logger';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class VSCWelcomeWebviewControllerFactory implements VSCWebviewControllerFactory<WelcomeInitMessage> {
    constructor(private api: WelcomeActionApi, private commonHandler: CommonActionMessageHandler) {}

    public tabIconPath(): string {
        return Container.context.asAbsolutePath('resources/atlassian-icon.svg');
    }

    public uiWebsocketPort(): number {
        return UIWSPort.WelcomePage;
    }

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: WelcomeInitMessage
    ): [WelcomeWebviewController, Disposable | undefined];

    public createController(postMessage: PostMessageFunc, factoryData?: WelcomeInitMessage): WelcomeWebviewController;

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: WelcomeInitMessage
    ): WelcomeWebviewController | [WelcomeWebviewController, Disposable | undefined] {
        const controller = new WelcomeWebviewController(
            postMessage,
            this.api,
            this.commonHandler,
            Logger.Instance,
            factoryData
        );

        return [controller, undefined];
    }

    public webviewHtml(extensionPath: string): string {
        return getHtmlForView(extensionPath, 'welcomePageV2');
    }
}
