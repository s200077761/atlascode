import * as vscode from 'vscode';
import * as pathlib from 'path';
import { Repository } from '../typings/git';

export class GitContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    get onDidChange(): vscode.Event<vscode.Uri> { return this._onDidChange.event; }

    constructor(private repository: Repository) { }

    async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        let { remote, branch, path, commit } = JSON.parse(uri.query);

        if (!path || !commit) {
            return '';
        }

        const absolutePath = pathlib.join(this.repository.rootUri.fsPath, path);
        let content = '';
        try {
            content = await this.repository.show(commit, absolutePath);
        } catch (err) {
            try {
                await this.repository.fetch(remote, branch);
                content = await this.repository.show(commit, absolutePath);
            } catch (err) {
                vscode.window.showErrorMessage(`We couldn't find commit ${commit} locally. You may want to sync the branch with remote. Sometimes commits can disappear after a force-push`);
            }
        }

        return content || '';
    }
}
