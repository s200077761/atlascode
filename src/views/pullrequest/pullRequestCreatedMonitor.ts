import * as path from 'path';
import * as vscode from "vscode";
import { BitbucketContext } from "../../bitbucket/bbContext";
import { Commands } from "../../commands";
import { PullRequestProvider } from '../../bitbucket/clientProvider';
import { getBitbucketRemotes } from '../../bitbucket/bbUtils';

export class PullRequestCreatedMonitor implements BitbucketActivityMonitor {
    private _lastCheckedTime = new Map<String, Date>();

    constructor(private _bbCtx: BitbucketContext) {
        this._bbCtx.getBitbucketRepositores().forEach(repo => this._lastCheckedTime.set(repo.rootUri.toString(), new Date()));
    }

    checkForNewActivity() {
        const promises = this._bbCtx.getBitbucketRepositores().map(repo => {
            const remotes = getBitbucketRemotes(repo);
            const remote = remotes.find(r => r.name === 'origin') || remotes[0];

            return PullRequestProvider.forRepository(repo).getLatest(repo, remote).then(prList => {
                const lastChecked = this._lastCheckedTime.has(repo.rootUri.toString())
                    ? this._lastCheckedTime.get(repo.rootUri.toString())!
                    : new Date();
                this._lastCheckedTime.set(repo.rootUri.toString(), new Date());

                let newPRs = prList.data.filter(i => Date.parse(i.data.ts!) > lastChecked.getTime());
                return newPRs;
            });
        });
        Promise.all(promises)
            .then(result => result.reduce((prev, curr) => prev.concat(curr), []))
            .then(allPRs => {
                if (allPRs.length === 1) {
                    let repoName = path.basename(allPRs[0].repository.rootUri.path);
                    vscode.window.showInformationMessage(`New pull request "${allPRs[0].data.title}" for repo "${repoName}"`, 'Show')
                        .then(usersChoice => {
                            if (usersChoice === 'Show') {
                                vscode.commands.executeCommand(Commands.BitbucketShowPullRequestDetails, allPRs[0]);
                            }
                        });
                } else if (allPRs.length > 0) {
                    let repoNames = [...new Set(allPRs.map(r => path.basename(r.repository.rootUri.path)))].join(", ");
                    vscode.window.showInformationMessage(`New pull requests found for the following repositories: ${repoNames}`, 'Show')
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
