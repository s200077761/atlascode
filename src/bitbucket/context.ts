import * as vscode from 'vscode';
import { Repository, API as GitApi } from "../typings/git";

// BitbucketContext stores the context (hosts, auth, current repo etc.)
// for all Bitbucket related actions.
export class BitbucketContext implements vscode.Disposable {
    private _onDidChangeBitbucketContext: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeBitbucketContext: vscode.Event<void> = this._onDidChangeBitbucketContext.event;

    private _gitApi: GitApi;
    private _repoMap: Map<string, Repository> = new Map();

    constructor(gitApi: GitApi) {
        this._gitApi = gitApi;
        this.refreshRepos();
        this._gitApi.onDidOpenRepository(() => this.refreshRepos());
        this._gitApi.onDidCloseRepository(() => this.refreshRepos());
    }

    private refreshRepos() {
        this._repoMap.clear();
        this._gitApi.repositories.forEach(repo => this._repoMap.set(repo.rootUri.toString(), repo));
        this._onDidChangeBitbucketContext.fire();
    }

    public getAllRepositores(): Repository[] {
        return this._gitApi.repositories;
    }
    public getRepository(repoUri: vscode.Uri): Repository | undefined {
        return this._repoMap.get(repoUri.toString());
    }

    dispose() {
        this._onDidChangeBitbucketContext.dispose();
    }
}