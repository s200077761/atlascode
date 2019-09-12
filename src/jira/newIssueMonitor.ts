import { window, commands } from "vscode";
import { Container } from "../container";
import { Commands } from "../commands";
import { Logger } from "../logger";
import { issuesForJQL } from "../jira/issuesForJql";
import { format } from "date-fns";
import { ProductJira } from "../atlclients/authInfo";
import { showIssue } from "../commands/jira/showIssue";
import { MinimalIssue, Project } from "./jira-client/model/entities";

export class NewIssueMonitor {
  private _workingProject: Project | undefined;
  private _timestamp = new Date();

  constructor() {
  }

  setProject(project: Project) {
    this._workingProject = project;
    this._timestamp = new Date();
  }

  async checkForNewIssues() {
    if (
      !this._workingProject ||
      !Container.onlineDetector.isOnline() ||
      !Container.config.jira.explorer.monitorEnabled ||
      !await Container.siteManager.productHasAtLeastOneSite(ProductJira)
    ) {
      return;
    }

    const ts = format(this._timestamp, "YYYY-MM-DD HH:mm");
    try {
      let newIssues = await issuesForJQL(`project = ${this._workingProject.id} AND created > "${ts}"`);
      newIssues = newIssues.filter(issue => issue.created! > this._timestamp);

      if (newIssues.length > 0) {
        this.showNotification(newIssues);
        newIssues.forEach(issue => {
          if (issue.created! > this._timestamp) {
            this._timestamp = issue.created!;
          }
        });
      }
    } catch (e) {
      Logger.error(new Error(`Error checking for new issues ${e}`));
    }
  }

  private showNotification(newIssues: MinimalIssue[]) {
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
          if (newIssues.length === 1) {
            showIssue(newIssues[0]);
          } else {
            commands.executeCommand("workbench.view.extension.atlascode-drawer");
          }
        }
      });
  }
}
