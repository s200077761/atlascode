import * as vscode from 'vscode';
import { Repository, API as GitApi } from "../typings/git";
import { configuration } from '../config/configuration';
import { BaseNode } from '../views/nodes/baseNode';
import { Commands } from '../commands';
import { Container } from '../container';
import { PaginatedPullRequests } from './model';
import { PullRequestApi } from './pullRequests';
import { PullRequestNodeDataProvider } from '../views/pullRequestNodeDataProvider';
import { authenticateBitbucket, clearBitbucketAuth } from '../commands/authenticate';
import { currentUserBitbucket } from '../commands/bitbucket/currentUser';
import { BitbucketContainerConfigurationKey } from '../constants';

const explorerLocation = {
    sourceControl: 'SourceControl',
    atlascode: 'Atlascode'
};
const vscodeContextSettingKey = 'atlascode.ctxKey.bb.explorerLocation';

// BitbucketContext stores the context (hosts, auth, current repo etc.)
// for all Bitbucket related actions.
export class BitbucketContext implements vscode.Disposable {
    private _onDidChangeBitbucketContext: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeBitbucketContext: vscode.Event<void> = this._onDidChangeBitbucketContext.event;

    private _gitApi: GitApi;
    private _repoMap: Map<string, Repository> = new Map();

    constructor(vscodeContext: vscode.ExtensionContext, gitApi: GitApi) {
        this._gitApi = gitApi;
        this.refreshRepos();
        this._gitApi.onDidOpenRepository(() => this.refreshRepos());
        this._gitApi.onDidCloseRepository(() => this.refreshRepos());

        this.setLocationContext();

        let prNodeDataProvider: PullRequestNodeDataProvider = new PullRequestNodeDataProvider(this);
        vscodeContext.subscriptions.push(
            vscode.window.registerTreeDataProvider<BaseNode>('atlascode.views.bb.pullrequestsTreeView', prNodeDataProvider),
            vscode.commands.registerCommand(Commands.AuthenticateBitbucket, authenticateBitbucket),
            vscode.commands.registerCommand(Commands.ClearBitbucketAuth, clearBitbucketAuth),
            vscode.commands.registerCommand(Commands.CurrentUserBitbucket, currentUserBitbucket),
            vscode.commands.registerCommand(Commands.BitbucketRefreshPullRequests, prNodeDataProvider.refresh, prNodeDataProvider),
            vscode.commands.registerCommand(Commands.BitbucketShowPullRequestDetails, async (pr) => {
                await Container.pullRequestViewManager.createOrShow(pr);
            }),
            vscode.commands.registerCommand(Commands.BitbucketPullRequestsNextPage, async (prs: PaginatedPullRequests) => {
                const result = await PullRequestApi.nextPage(prs);
                prNodeDataProvider.addItems(result);
            })
        );

        vscodeContext.subscriptions.push(configuration.onDidChange(this.configChangeHandler));
    }

    private refreshRepos() {
        this._repoMap.clear();
        this._gitApi.repositories.forEach(repo => this._repoMap.set(repo.rootUri.toString(), repo));
        this._onDidChangeBitbucketContext.fire();
    }

    private configChangeHandler = (e: vscode.ConfigurationChangeEvent) => {
        if (!configuration.changed(e, BitbucketContainerConfigurationKey)) { return; }

        this.setLocationContext();
        this._onDidChangeBitbucketContext.fire();
    }

    private setLocationContext() {
        let location = configuration.get<string>(BitbucketContainerConfigurationKey);
        if (location !== explorerLocation.sourceControl && location !== explorerLocation.atlascode) {
            location = explorerLocation.sourceControl;
        }
        vscode.commands.executeCommand('setContext', vscodeContextSettingKey, location);
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