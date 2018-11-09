import * as vscode from 'vscode';
import * as pathlib from 'path';
import { BitbucketContext } from '../bitbucket/context';

export class GitContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    get onDidChange(): vscode.Event<vscode.Uri> { return this._onDidChange.event; }

    constructor(private bbContext: BitbucketContext) { }

    async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        let { repoUri, remote, branch, path, commit } = JSON.parse(uri.query);

        const u: vscode.Uri = vscode.Uri.parse(repoUri);
        const repo = this.bbContext.getRepository(u);
        if (!repo || !path || !commit) {
            return '';
        }

        const absolutePath = pathlib.join(repo.rootUri.fsPath, path);
        let content = '';
        try {
            content = await repo.show(commit, absolutePath);
        } catch (err) {
            try {
                await repo.fetch(remote, branch);
                content = await repo.show(commit, absolutePath);
            } catch (err) {
                vscode.window.showErrorMessage(`We couldn't find commit ${commit} locally. You may want to sync the branch with remote. Sometimes commits can disappear after a force-push`);
            }
        }

        return content || '';
    }
}
