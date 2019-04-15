import { Disposable, ConfigurationChangeEvent, window, commands } from "vscode";
import { Container } from "../container";
import { Commands } from "../commands";
import { Logger } from "../logger";
import { configuration, WorkingProject } from "../config/configuration";
import { issuesForJQL } from "../jira/issuesForJql";
import * as moment from "moment";
import { AuthProvider } from "../atlclients/authInfo";
import { Issue } from "./jiraIssue";
import { RefreshTimer } from "../views/RefreshTimer";

export class NewIssueMonitor implements Disposable {
  private _disposables: Disposable[] = [];
  private _workingProject: WorkingProject | undefined;
  private _timestamp = new Date();
  private _refreshTimer: RefreshTimer;

  constructor() {
    this._refreshTimer = new RefreshTimer(undefined, 'jira.issueMonitor.refreshInterval', () => this.checkForNewIssues());
    this._disposables.push(
      Disposable.from(
        configuration.onDidChange(this.onConfigurationChanged, this),
        this._refreshTimer
      )
    );

    void this.onConfigurationChanged(configuration.initializingChangeEvent);
  }

  dispose() {
    this._disposables.forEach(d => d.dispose());
  }

  protected async onConfigurationChanged(e: ConfigurationChangeEvent) {
    const initializing = configuration.initializing(e);
    if (
      initializing ||
      configuration.changed(e, "jira.issueMonitor.refreshInterval") ||
      configuration.changed(e, "jira.workingProject")
    ) {
      this._workingProject = await Container.jiraSiteManager.getEffectiveProject();
      this._timestamp = new Date();
    }
  }

  async checkForNewIssues() {
    if (!this._workingProject || !Container.onlineDetector.isOnline() || !await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
      return;
    }

    const ts = moment(this._timestamp).format("YYYY-MM-DD HH:mm");

    issuesForJQL(`project = ${this._workingProject.id} AND created > "${ts}"`)
      .then(newIssues => {
        // JQL only allows minute precision when searching so we need to filter out anything
        // created in the minute leading up to the timestamp (which will inlcude the issue 
        // from which we got the timestamp)
        newIssues = newIssues.filter(issue => issue.created > this._timestamp);
        if (newIssues.length > 0) {
          this.showNotification(newIssues);
          newIssues.forEach(issue => {
            if (issue.created > this._timestamp) {
              this._timestamp = issue.created;
            }
          });
        }
      })
      .catch(e => {
        Logger.error(new Error(`Error checking for new issues ${e}`));
      });
  }

  private showNotification(newIssues: Issue[]) {
    const issueNames = newIssues.map(issue => `[${issue.key}] "${issue.summary}"`);
    commands.executeCommand(Commands.RefreshJiraExplorer);
    var message = "";
    if (newIssues.length === 1) {
      message = `${issueNames[0]} added to ${this._workingProject!.name}`;
    }
    else if (newIssues.length <= 3) {
      message = `${issueNames.slice(0, -1).join(', ')} and ${issueNames.slice(-1)} added to ${this._workingProject!.name}`;
    }
    else {
      message = `${issueNames.slice(0, 2).join(', ')} and ${newIssues.length - 2} other new issues added to ${this._workingProject!.name}.`;
    }
    window.showInformationMessage(message, "View Atlassian Explorer")
      .then((selection) => {
        if (selection) {
          commands.executeCommand("workbench.view.extension.atlascode-drawer");
        }
      });
  }
}
