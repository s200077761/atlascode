import pAny from 'p-any';
import pathlib from 'path';
import vscode from 'vscode';
import { BitbucketContext } from '../bitbucket/bbContext';
import { bitbucketSiteForRemote, clientForSite, parseGitUrl, urlForRemote } from '../bitbucket/bbUtils';
import { Container } from '../container';
import { PRFileDiffQueryParams } from './pullrequest/pullRequestNode';

export class GitContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    constructor(private bbContext: BitbucketContext) {}

    async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        const { repoUri, repoHref, branchName, path, commitHash } = JSON.parse(uri.query) as PRFileDiffQueryParams;

        if (!repoUri) {
            return '';
        }
        const u: vscode.Uri = vscode.Uri.parse(repoUri);
        const wsRepo = this.bbContext.getRepository(u);
        if (!wsRepo || !path || !commitHash) {
            return '';
        }

        let content = '';
        const scm = Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri);
        if (!scm) {
            return '';
        }

        const absolutePath = pathlib.join(scm.rootUri.fsPath, path);

        try {
            content = await pAny([
                (async () => {
                    try {
                        return await scm.show(commitHash, absolutePath);
                    } catch (err) {
                        await scm.fetch(wsRepo.mainSiteRemote.remote.name, branchName);
                        return await scm.show(commitHash, absolutePath);
                    }
                })(),
                (async () => {
                    const parsedRepo = parseGitUrl(urlForRemote(wsRepo.mainSiteRemote.remote));
                    const parsedSourceRepo = parseGitUrl(repoHref).toString(parsedRepo.protocol);
                    const site = bitbucketSiteForRemote({
                        name: 'DUMMY',
                        fetchUrl: parsedSourceRepo,
                        isReadOnly: true,
                    });
                    if (site) {
                        const bbApi = await clientForSite(site);
                        const fileContent = await bbApi.pullrequests.getFileContent(site, commitHash, path);
                        return fileContent;
                    }
                    throw new Error('error fetching file content using REST API');
                })(),
            ]);
        } catch (err) {
            vscode.window.showErrorMessage(
                `We couldn't find commit ${commitHash} locally. You may want to sync the branch with remote. Sometimes commits can disappear after a force-push`
            );
        }

        return content || '';
    }
}
