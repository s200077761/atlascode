import * as path from 'path';
import {
    Disposable,
    Uri,
    ViewColumn,
    WebviewPanel,
    WebviewPanelOnDidChangeViewStateEvent,
    window
} from 'vscode';
import { Resources } from '../resources';
import { Action, isAlertable } from '../ipc/action';
import { Logger } from '../logger';

export abstract class AbstractReactWebview<S,R extends Action> implements Disposable {

    private _disposablePanel: Disposable | undefined;
    private _panel: WebviewPanel | undefined;
    private readonly _extensionPath: string;
    private static readonly viewType = 'react';

    constructor(extensionPath: string) {
        this._extensionPath = extensionPath;

    }

    abstract get title(): string;
    abstract get id(): string;
    abstract invalidate(): void;

    get visible() {
        return this._panel === undefined ? false : this._panel.visible;
    }

    hide() {
        if (this._panel === undefined) { return; }

        this._panel.dispose();
    }

    async createOrShow(): Promise<void> {
        if (this._panel === undefined) {
            this._panel = window.createWebviewPanel(
                AbstractReactWebview.viewType,
                this.title,
                ViewColumn.Active, // { viewColumn: ViewColumn.Active, preserveFocus: false }
                {
                    retainContextWhenHidden: true,
                    enableFindWidget: true,
                    enableCommandUris: true,
                    enableScripts: true,
                    localResourceRoots: [Uri.file(path.join(this._extensionPath, 'build'))]
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
            this._panel.reveal(ViewColumn.Active); // , false);
        }
    }

    private onViewStateChanged(e: WebviewPanelOnDidChangeViewStateEvent) {
        Logger.debug('AbstractReactWebview.onViewStateChanged', e.webviewPanel.visible);
        // HACK: Because messages aren't sent to the webview when hidden, we need make sure it is up-to-date
        if (e.webviewPanel.visible) {
            this.invalidate();
            this.createOrShow();
        }
    }

    protected onMessageReceived(a: R):boolean {
        switch (a.action) {
            case 'alertError': {
                if(isAlertable(a)) {
                    window.showErrorMessage(a.message);
                }
                return true;
            }
        }
        return false;
    }

    protected postMessage(message:S) {
        if (this._panel === undefined){ return false; }

        const result = this._panel!.webview.postMessage(message);

        return result;
    }

    private onPanelDisposed() {
        Logger.debug("webview panel disposed");
        if (this._disposablePanel){ this._disposablePanel.dispose();}
        this._panel = undefined;
    }

    public dispose() {
        Logger.debug("vscode webview disposed");
        if(this._disposablePanel) {
            this._disposablePanel.dispose();
        }
    }

    private _getHtmlForWebview(viewName:string) {
        const manifest = require(path.join(this._extensionPath, 'build', 'asset-manifest.json'));
        const mainScript = manifest['main.js'];
        const mainStyle = manifest['main.css'];

        const scriptUri = Uri.file(path.join(this._extensionPath, 'build', mainScript)).with({ scheme: 'vscode-resource' });
        const styleUri = Uri.file(path.join(this._extensionPath, 'build', mainStyle)).with({ scheme: 'vscode-resource' });
        const tmpl = Resources.html.get('reactHtml');

        if (tmpl) {
            return tmpl({
                view:viewName,
                styleUri: styleUri,
                scriptUri: scriptUri,
                baseUri: Uri.file(path.join(this._extensionPath, 'build')).with({ scheme: 'vscode-resource' })
            });
        } else {
            return Resources.htmlNotFound({resource: 'reactHtml'});
        }
        
    }
}
