import * as path from 'path';
import * as vscode from 'vscode';
import { Resources } from '../resources';
// import { PullRequestDecorated } from '../bitbucket/model';
// import { PullRequest } from '../bitbucket/pullRequests';

export class ConfigReactPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
    public static currentPanel: ConfigReactPanel | undefined;

    private static readonly viewType = 'react';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionPath: string) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel, show it.
        // Otherwise, create a new panel.
        if (ConfigReactPanel.currentPanel) {
            ConfigReactPanel.currentPanel._panel.reveal(column);
        } else {
            ConfigReactPanel.currentPanel = new ConfigReactPanel(extensionPath, column || vscode.ViewColumn.One);
        }
    }

    private constructor(extensionPath: string, column: vscode.ViewColumn) {
        this._extensionPath = extensionPath;

        this._panel = vscode.window.createWebviewPanel(ConfigReactPanel.viewType, "AtlasCode Configuration", column, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this._extensionPath, 'build'))
            ]
        });

        // Set the webview's initial html content 
        this._panel.webview.html = this._getHtmlForWebview();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(message => {
            console.log(message);
            switch (message.command) {
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
                    return;
            }
        }, null, this._disposables);
    }

    public dispose() {
        ConfigReactPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview() {
        const manifest = require(path.join(this._extensionPath, 'build', 'asset-manifest.json'));
        const mainScript = manifest['main.js'];
        const mainStyle = manifest['main.css'];
        const myScript = manifest['configView.js'];

        const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'build', mainScript));
        const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
        const stylePathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'build', mainStyle));
        const styleUri = stylePathOnDisk.with({ scheme: 'vscode-resource' });

        const myScriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'build', myScript));
        const myScriptUri = myScriptPathOnDisk.with({ scheme: 'vscode-resource' });

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();

        const tmpl = Resources.html.get('configHtml');

        if (tmpl) {
            return tmpl({
                nonce:nonce,
                styleUri: styleUri,
                scriptUri: scriptUri,
                myScriptUri: myScriptUri,
                baseUri: vscode.Uri.file(path.join(this._extensionPath, 'build')).with({ scheme: 'vscode-resource' })
            });
        } else {
            return Resources.htmlNotFound({resource: 'configHtml'});
        }
        
    }
}

function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}