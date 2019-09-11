import * as path from 'path';
import * as fs from 'fs';
import {
    Disposable,
    Uri,
    ViewColumn,
    WebviewPanel,
    WebviewPanelOnDidChangeViewStateEvent,
    EventEmitter,
    Event,
    window
} from 'vscode';
import { Resources } from '../resources';
import { isAlertable, isPMFSubmitAction, isAction } from '../ipc/messaging';
import { viewScreenEvent } from '../analytics';
import { Container } from '../container';
import { OnlineInfoEvent } from '../util/online';
import { submitPMF } from '../pmf/pmfSubmitter';
import { DetailedSiteInfo } from '../atlclients/authInfo';

// ReactWebview is an interface that can be used to deal with webview objects when you don't know their generic typings.
export interface ReactWebview extends Disposable {
    hide(): void;
    createOrShow(): Promise<void>;
    onDidPanelDispose(): Event<void>;
    invalidate(): void;
}

// InitializingWebview is an interface that exposes an initialize method that may be called to initialize the veiw object with data.
// Type T is the type of the data that's passed to the initialize method.
// This interface is called in AbstractMultiViewManager
export interface InitializingWebview<T> {
    initialize(data: T): void;
}

// isInitializable tests to see if a webview is an InitializingWebview and casts it if it is.
export function isInitializable(object: any): object is InitializingWebview<any> {
    return (<InitializingWebview<any>>object).initialize !== undefined;
}

// AbstractReactWebview is the base class for atlascode react webviews.
// This handles the panel creation/disposing, comms between vscode and react, etc.
// Generic Types:
// S = the type of ipc.Message to send to react
// R = the type of ipc.Action to receive from react
export abstract class AbstractReactWebview implements ReactWebview {
    private _disposablePanel: Disposable | undefined;
    protected _panel: WebviewPanel | undefined;
    private readonly _extensionPath: string;
    private static readonly viewType = 'react';
    private _onDidPanelDispose = new EventEmitter<void>();
    protected isRefeshing: boolean = false;
    private _viewEventSent: boolean = false;

    constructor(extensionPath: string) {
        this._extensionPath = extensionPath;


        Container.context.subscriptions.push(
            Container.onlineDetector.onDidOnlineChange(this.onDidOnlineChange, this),
        );
    }

    private onDidOnlineChange(e: OnlineInfoEvent) {
        this.postMessage({ type: 'onlineStatus', isOnline: e.isOnline });
    }

    onDidPanelDispose(): Event<void> {
        return this._onDidPanelDispose.event;
    }
    abstract get title(): string;
    abstract get id(): string;
    abstract async invalidate(): Promise<void>;
    abstract get siteOrUndefined(): DetailedSiteInfo | undefined;

    get visible() {
        return this._panel === undefined ? false : this._panel.visible;
    }

    hide() {
        if (this._panel === undefined) { return; }

        this._panel.dispose();
    }

    public async createOrShow(column?: ViewColumn): Promise<void> {
        if (this._panel === undefined) {
            this._panel = window.createWebviewPanel(
                AbstractReactWebview.viewType,
                this.title,
                column ? column : ViewColumn.Active,
                {
                    retainContextWhenHidden: true,
                    enableFindWidget: true,
                    enableCommandUris: true,
                    enableScripts: true,
                    localResourceRoots: [Uri.file(path.join(this._extensionPath, 'build')), Uri.file(path.join(this._extensionPath, 'images'))]
                }
            );

            this._disposablePanel = Disposable.from(
                this._panel,
                this._panel.onDidDispose(this.onPanelDisposed, this),
                this._panel.onDidChangeViewState(this.onViewStateChanged, this),
                this._panel.webview.onDidReceiveMessage(this.onMessageReceived, this)
            );

            this._panel.webview.html = this._getHtmlForWebview(this.id);
        }
        else {
            this._panel.webview.html = this._getHtmlForWebview(this.id);
            this._panel.reveal(column ? column : ViewColumn.Active); // , false);
        }

    }

    private onViewStateChanged(e: WebviewPanelOnDidChangeViewStateEvent) {
        // HACK: Because messages aren't sent to the webview when hidden, we need make sure it is up-to-date
        if (e.webviewPanel.visible) {
            this.postMessage({ type: 'onlineStatus', isOnline: Container.onlineDetector.isOnline() });
            this.postMessage({ type: 'pmfStatus', showPMF: Container.pmfStats.shouldShowSurvey() });

            this.invalidate().then(() => {
                if (!this._viewEventSent) {
                    this._viewEventSent = true;
                    viewScreenEvent(this.id, this.siteOrUndefined).then(e => { Container.analyticsClient.sendScreenEvent(e); });
                }
            });
        }
    }

    protected async onMessageReceived(a: any): Promise<boolean> {
        if (isAction(a)) {
            switch (a.action) {
                case 'alertError': {
                    if (isAlertable(a)) {
                        window.showErrorMessage(a.message);
                    }
                    return true;
                }
                case 'pmfLater': {
                    Container.pmfStats.snoozeSurvey();
                    return true;
                }
                case 'pmfNever': {
                    Container.pmfStats.touchSurveyed();
                    return true;
                }
                case 'pmfSubmit': {
                    if (isPMFSubmitAction(a)) {
                        submitPMF(a.pmfData);
                    }
                    Container.pmfStats.touchSurveyed();
                    return true;
                }
            }
        }
        return false;
    }

    protected formatErrorReason(e: any, title?: string): any {
        if (e.response) {
            if (e.response.data && e.response.data !== "") {
                return (title) ? { ...e.response.data, ...{ title: title } } : e.response.data;
            }
        } else if (e.message) {
            return (title) ? { title: title, errorMessages: [e.message] } : e.message;
        }

        return (title) ? { title: title, errorMessages: [`${e}`] } : e;
    }

    protected postMessage(message: any) {
        if (this._panel === undefined) { return false; }

        const result = this._panel!.webview.postMessage(message);

        return result;
    }

    protected onPanelDisposed() {
        if (this._disposablePanel) { this._disposablePanel.dispose(); }
        this._panel = undefined;
        this._onDidPanelDispose.fire();
    }

    public dispose() {
        if (this._disposablePanel) {
            this._disposablePanel.dispose();
        }

        this._onDidPanelDispose.dispose();
    }

    private _getHtmlForWebview(viewName: string) {
        const manifest = JSON.parse(fs.readFileSync(path.join(this._extensionPath, 'build', 'asset-manifest.json')).toString());
        const mainScript = manifest['main.js'];
        const mainStyle = manifest['main.css'];

        const scriptUri = Uri.file(path.join(this._extensionPath, 'build', mainScript)).with({ scheme: 'vscode-resource' });
        const styleUri = Uri.file(path.join(this._extensionPath, 'build', mainStyle)).with({ scheme: 'vscode-resource' });
        const tmpl = Resources.html.get('reactHtml');

        if (tmpl) {
            return tmpl({
                view: viewName,
                styleUri: styleUri,
                scriptUri: scriptUri,
                baseUri: Uri.file(this._extensionPath).with({ scheme: 'vscode-resource' }),
            });
        } else {
            return Resources.htmlNotFound({ resource: 'reactHtml' });
        }

    }
}
