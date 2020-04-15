import pAny from 'p-any';
import pathlib from 'path';
import vscode from 'vscode';
import { BitbucketContext } from '../bitbucket/bbContext';
import { clientForSite } from '../bitbucket/bbUtils';
import { Container } from '../container';
import { PRFileDiffQueryParams } from './pullrequest/pullRequestNode';

export class GitContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    constructor(private bbContext: BitbucketContext) {}

    async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        const { site, repoUri, branchName, path, commitHash } = JSON.parse(uri.query) as PRFileDiffQueryParams;

        if (!path || !commitHash) {
            return '';
        }

        let content = '';
        try {
            content = await pAny([
                (async () => {
                    const u: vscode.Uri = vscode.Uri.parse(repoUri);
                    const wsRepo = this.bbContext.getRepository(u);
                    const scm = wsRepo ? Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri) : undefined;
                    if (!scm) {
                        throw new Error('no workspace repo');
                    }

                    const absolutePath = pathlib.join(scm.rootUri.fsPath, path);
                    try {
                        return await scm.show(commitHash, absolutePath);
                    } catch (err) {
                        await scm.fetch(wsRepo!.mainSiteRemote.remote.name, branchName);
                        return await scm.show(commitHash, absolutePath);
                    }
                })(),
                (async () => {
                    const bbApi = await clientForSite(site);
                    const fileContent = await bbApi.pullrequests.getFileContent(site, commitHash, path);
                    return fileContent;
                })(),
            ]);
        } catch (err) {
            vscode.window.showErrorMessage(
                `We couldn't find ${path} at commit ${commitHash}. You may want to sync the branch with remote. Sometimes commits can disappear after a force-push.`
            );
        }

        return content || '';
    }
}
