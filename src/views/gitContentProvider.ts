import * as vscode from 'vscode';
import * as pathlib from 'path';
import { BitbucketContext } from '../bitbucket/bbContext';
import { FileDiffQueryParams } from './pullrequest/pullRequestNode';
import { GitUrlParse } from '../bitbucket/pullRequests';

export class GitContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    get onDidChange(): vscode.Event<vscode.Uri> { return this._onDidChange.event; }

    constructor(private bbContext: BitbucketContext) { }

    async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        const { repoUri, remote, branchName, path, commitHash } = JSON.parse(uri.query) as FileDiffQueryParams;

        if (!repoUri) {
            return '';
        }
        const u: vscode.Uri = vscode.Uri.parse(repoUri);
        const repo = this.bbContext.getRepository(u);
        if (!repo || !path || !commitHash) {
            return '';
        }

        const absolutePath = pathlib.join(repo.rootUri.fsPath, path);
        let content = '';
        try {
            content = await repo.show(commitHash, absolutePath);
        } catch (err) {
            try {
                await repo.fetch(remote.name, branchName);
                content = await repo.show(commitHash, absolutePath);
            } catch (err) {
                try {
                    await repo.addRemote(remote.name, GitUrlParse(remote.fetchUrl!).toString("ssh"));
                    await repo.fetch(remote.name, branchName);
                    content = await repo.show(commitHash, absolutePath);
                } catch (err) {
                    vscode.window.showErrorMessage(`We couldn't find commit ${commitHash} locally. You may want to sync the branch with remote. Sometimes commits can disappear after a force-push`);
                }
            }
        }

        return content || '';
    }
}
