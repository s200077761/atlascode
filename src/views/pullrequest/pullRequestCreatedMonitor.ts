import * as path from 'path';
import * as vscode from "vscode";
import { BitbucketContext } from "../../bitbucket/bbContext";
import { PullRequestApi } from "../../bitbucket/pullRequests";
import { Commands } from "../../commands";

export class PullRequestCreatedMonitor implements BitbucketActivityMonitor {
    private _lastCheckedTime = new Map<String, Date>();

    constructor(private _bbCtx: BitbucketContext) {
        this._bbCtx.getBitbucketRepositores().forEach(repo => this._lastCheckedTime.set(repo.rootUri.toString(), new Date()));
    }

    checkForNewActivity() {
        const promises = this._bbCtx.getBitbucketRepositores().map(repo => {
            return PullRequestApi.getLatest(repo).then(prList => {
                const lastChecked = this._lastCheckedTime.has(repo.rootUri.toString())
                    ? this._lastCheckedTime.get(repo.rootUri.toString())!
                    : new Date();
                this._lastCheckedTime.set(repo.rootUri.toString(), new Date());

                if (prList.data.length > 0 && Date.parse(prList.data[0].data.ts) > lastChecked.getTime()) {
                    return [path.basename(repo.rootUri.fsPath)];
                }
                return [];
            });
        });
        Promise.all(promises)
            .then(result => result.reduce((prev, curr) => prev.concat(curr), []))
            .then(notifiableRepos => {
                if (notifiableRepos.length > 0) {
                    vscode.window.showInformationMessage(`New pull requests found for the following repositories: ${notifiableRepos.join(', ')}`, 'Show')
                        .then(usersChoice => {
                            if (usersChoice === 'Show') {
                                vscode.commands.executeCommand('workbench.view.extension.atlascode-drawer');
                                vscode.commands.executeCommand(Commands.BitbucketRefreshPullRequests);
                            }
                        });
                }
            });
    }
}