import { Disposable } from 'vscode';
import { WebviewController } from '../lib/webview/controller/webviewController';

export type PostMessageFunc = (m: any) => Thenable<boolean>;

export interface VSCWebviewControllerFactory<FD> {
    tabIconPath(): string;
    webviewHtml(extensionPath: string): string;

    createController(postMessage: PostMessageFunc, factoryData?: FD): [WebviewController<FD>, Disposable | undefined];
    createController(postMessage: PostMessageFunc, factoryData?: FD): WebviewController<FD>;
    uiWebsocketPort(): number;
}
