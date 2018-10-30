import * as path from 'path';
import * as vscode from 'vscode';
import { PullRequestDecorated } from '../bitbucket/model';
import { PullRequest } from '../bitbucket/pullRequests';

export class PullRequestReactPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
    public static currentPanel: PullRequestReactPanel | undefined;

    private static readonly viewType = 'react';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionPath: string) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel, show it.
        // Otherwise, create a new panel.
        if (PullRequestReactPanel.currentPanel) {
            PullRequestReactPanel.currentPanel._panel.reveal(column);
        } else {
            PullRequestReactPanel.currentPanel = new PullRequestReactPanel(extensionPath, column || vscode.ViewColumn.One);
        }
    }

    private constructor(extensionPath: string, column: vscode.ViewColumn) {
        this._extensionPath = extensionPath;

        this._panel = vscode.window.createWebviewPanel(PullRequestReactPanel.viewType, "Pull request", column, {
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

    public async updatePullRequest(pr: PullRequestDecorated) {
        let promises = Promise.all([
            PullRequest.getPullRequestCommits(pr),
            PullRequest.getPullRequestComments(pr)
        ]);
        promises.then(result => {
            let [commits, comments] = result;
            // Send a message to the webview webview.
            // You can send any JSON serializable data.
            this._panel.webview.postMessage({
                command: 'update-pr',
                commits: commits,
                comments: comments,
                pr: pr.data
            });
        });
    }

    public dispose() {
        PullRequestReactPanel.currentPanel = undefined;

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

        const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'build', mainScript));
        const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
        const stylePathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'build', mainStyle));
        const styleUri = stylePathOnDisk.with({ scheme: 'vscode-resource' });

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<title>React App</title>
				<link rel="stylesheet" type="text/css" href="${styleUri}">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}';style-src vscode-resource: 'unsafe-inline' http: https: data:;">
				<base href="${vscode.Uri.file(path.join(this._extensionPath, 'build')).with({ scheme: 'vscode-resource' })}/">
			</head>

			<body>
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="root"></div>
				
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
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