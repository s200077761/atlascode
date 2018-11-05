import * as path from 'path';
import * as vscode from 'vscode';
import { Resources } from '../resources';

export abstract class AbstractReactWebview implements vscode.Disposable {

    private _disposablePanel: vscode.Disposable | undefined;
    private _panel: vscode.WebviewPanel | undefined;
    private readonly _extensionPath: string;
    private static readonly viewType = 'react';

    constructor(extensionPath: string) {
        this._extensionPath = extensionPath;

    }

    abstract get title(): string;
    abstract get id(): string;

    get visible() {
        return this._panel === undefined ? false : this._panel.visible;
    }

    hide() {
        if (this._panel === undefined) { return; }

        this._panel.dispose();
    }

    async createOrShow(): Promise<void> {

        if (this._panel === undefined) {
            this._panel = vscode.window.createWebviewPanel(
                AbstractReactWebview.viewType,
                this.title,
                vscode.ViewColumn.Active, // { viewColumn: ViewColumn.Active, preserveFocus: false }
                {
                    retainContextWhenHidden: true,
                    enableFindWidget: true,
                    enableCommandUris: true,
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.file(path.join(this._extensionPath, 'build'))]
                }
            );

            this._disposablePanel = vscode.Disposable.from(
                this._panel,
                this._panel.onDidDispose(this.onPanelDisposed, this)//,
                //this._panel.webview.onDidReceiveMessage(this.onMessageReceived, this)
            );

            this._panel.webview.html = this._getHtmlForWebview(this.id);
        }
        else {
            this._panel.webview.html = this._getHtmlForWebview(this.id);
            this._panel.reveal(vscode.ViewColumn.Active); // , false);
        }
    }

    private onPanelDisposed() {
        if (this._disposablePanel){ this._disposablePanel.dispose();}
        this._panel = undefined;
    }

    public dispose() {
        if(this._disposablePanel) {
            this._disposablePanel.dispose();
        }
    }

    private _getHtmlForWebview(viewName:string) {
        const manifest = require(path.join(this._extensionPath, 'build', 'asset-manifest.json'));
        const mainScript = manifest['main.js'];
        const mainStyle = manifest['main.css'];

        const scriptUri = vscode.Uri.file(path.join(this._extensionPath, 'build', mainScript)).with({ scheme: 'vscode-resource' });
        const styleUri = vscode.Uri.file(path.join(this._extensionPath, 'build', mainStyle)).with({ scheme: 'vscode-resource' });
        const tmpl = Resources.html.get('reactHtml');

        if (tmpl) {
            return tmpl({
                view:viewName,
                styleUri: styleUri,
                scriptUri: scriptUri,
                baseUri: vscode.Uri.file(path.join(this._extensionPath, 'build')).with({ scheme: 'vscode-resource' })
            });
        } else {
            return Resources.htmlNotFound({resource: 'reactHtml'});
        }
        
    }
}

// function getNonce() {
//     let text = "";
//     const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//     for (let i = 0; i < 32; i++) {
//         text += possible.charAt(Math.floor(Math.random() * possible.length));
//     }
//     return text;
// }