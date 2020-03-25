import { Disposable } from 'vscode';
import { Container } from '../../container';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { PipelinesSummaryActionApi } from '../../lib/webview/controller/pipelines/pipelinesSummaryActionApi';
import {
    id,
    PipelineSummaryWebviewController,
    title
} from '../../lib/webview/controller/pipelines/pipelineSummaryWebviewController';
import { Logger } from '../../logger';
import { Pipeline } from '../../pipelines/model';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class PipelineSummaryWebviewControllerFactory implements VSCWebviewControllerFactory<Pipeline> {
    constructor(private api: PipelinesSummaryActionApi) {}

    public tabIconPath(): string {
        return Container.context.asAbsolutePath('resources/BitbucketFavicon.png');
    }

    public uiWebsocketPort(): number {
        return UIWSPort.Settings;
    }

    public title(): string {
        return title;
    }

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: Pipeline
    ): [PipelineSummaryWebviewController, Disposable | undefined];

    public createController(postMessage: PostMessageFunc, factoryData?: Pipeline): PipelineSummaryWebviewController;

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: Pipeline
    ): PipelineSummaryWebviewController | [PipelineSummaryWebviewController, Disposable | undefined] {
        const controller = new PipelineSummaryWebviewController(postMessage, this.api, Logger.Instance, factoryData);

        const disposables = Disposable.from();

        return [controller, disposables];
    }

    public webviewHtml(extensionPath: string): string {
        const html = getHtmlForView(extensionPath, id);
        return html;
    }
}
