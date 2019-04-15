import * as vscode from "vscode";
import { Commands } from "../../commands";
import { BitbucketIssuesApi } from "../../bitbucket/bbIssues";
import { Repository } from "../../typings/git";

export class BitbucketIssuesMonitor implements BitbucketActivityMonitor {
  private _lastCheckedTime = new Map<String, Date>();

  constructor(private _repos: Repository[]) {
    this._repos.forEach(repo => this._lastCheckedTime.set(repo.rootUri.toString(), new Date()));
  }

  async checkForNewActivity() {
    const promises = this._repos.map(repo => {
      return BitbucketIssuesApi.getLatest(repo).then(issuesList => {
        const lastChecked = this._lastCheckedTime.has(repo.rootUri.toString())
          ? this._lastCheckedTime.get(repo.rootUri.toString())!
          : new Date();
        this._lastCheckedTime.set(repo.rootUri.toString(), new Date());

        if (issuesList.data.length > 0 && Date.parse(issuesList.data[0].created_on!) > lastChecked.getTime()) {
          return [repo.rootUri.path.split('/').pop()!];
        }
        return [];
      });
    });
    Promise.all(promises)
      .then(result => result.reduce((prev, curr) => prev.concat(curr), []))
      .then(notifiableRepos => {
        if (notifiableRepos.length > 0) {
          vscode.window.showInformationMessage(`New Bitbucket issues were created for the following repositories: ${notifiableRepos.join(', ')}`, 'Show')
            .then(usersChoice => {
              if (usersChoice === 'Show') {
                vscode.commands.executeCommand('workbench.view.extension.atlascode-drawer');
                vscode.commands.executeCommand(Commands.BitbucketIssuesRefresh);
              }
            });
        }
      });
  }
}