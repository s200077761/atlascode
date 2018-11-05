import * as path from 'path';
import * as vscode from 'vscode';
import { PullRequestDecorated } from '../bitbucket/model';
import { PullRequest } from '../bitbucket/pullRequests';
import { generateWebviewHtml } from '../resources';
import { getCurrentUser } from '../bitbucket/user';
import { Remote, Repository } from '../typings/git';
import { Logger } from '../logger';

class PRState {
    constructor(
        readonly repository?: Repository,
        readonly remote?: Remote,
        readonly currentUser?: Bitbucket.Schema.User,
        public pr?: Bitbucket.Schema.Pullrequest,
        public commits?: Bitbucket.Schema.Commit[],
        public comments?: Bitbucket.Schema.Comment[]) {
    }
    isValid = () => {
        return !!this.repository
            && !!this.remote
            && !!this.pr
            && !!this.currentUser
            && !!this.commits
            && !!this.comments;
    }
}

export class PullRequestReactPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
    public static currentPanel: PullRequestReactPanel | undefined;

    private static readonly viewType = 'react';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private _disposables: vscode.Disposable[] = [];
    private _state: PRState = new PRState();

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
        this._panel.webview.html = generateWebviewHtml(this._extensionPath);

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
                case 'approve':
                    this.approve().catch((e: any) => {
                        Logger.error(new Error(`error approving pull request: ${e}`));
                        vscode.window.showErrorMessage('Pull reqeust could not be approved');
                    });
            }
        }, null, this._disposables);
    }

    public async updatePullRequest(pr: PullRequestDecorated) {
        if (this._state.isValid()) {
            this._panel.webview.postMessage({
                command: 'update-pr',
                currentUser: this._state.currentUser,
                pr: this._state.pr,
                commits: this._state.commits,
                comments: this._state.comments
            });
        }
        let promises = Promise.all([
            getCurrentUser(),
            PullRequest.getPullRequestCommits(pr),
            PullRequest.getPullRequestComments(pr)
        ]);
        promises.then(result => {
            let [currentUser, commits, comments] = result;
            this._state = new PRState(pr.repository, pr.remote, currentUser, pr.data, commits, comments);
            // Send a message to the webview webview.
            // You can send any JSON serializable data.
            this._panel.webview.postMessage({
                command: 'update-pr',
                currentUser: this._state.currentUser,
                pr: this._state.pr,
                commits: this._state.commits,
                comments: this._state.comments
            });
        });
    }

    private async approve() {
        await PullRequest.approve({ repository: this._state.repository!, remote: this._state.remote!, data: this._state.pr! });
        await this.forceUpdatePullRequest();
    }

    private async forceUpdatePullRequest() {
        const result = await PullRequest.getPullRequest({ repository: this._state.repository!, remote: this._state.remote!, data: this._state.pr! });
        this._state.pr = result.data;
        await this.updatePullRequest(result);
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
}