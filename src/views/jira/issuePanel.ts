import * as vscode from "vscode";
import { JiraIssue } from "../../jira/jiraIssue";

export class IssuePanel {
  public static currentPanel: IssuePanel | undefined;
  public static readonly viewType = "jiraIssue";

  private readonly panel: vscode.WebviewPanel;
  private issue: JiraIssue | undefined;

  public static createOrShow(extensionPath: string, issue: JiraIssue) {
    if (IssuePanel.currentPanel) {
      IssuePanel.currentPanel.panel.reveal();
    } else {
      const panel = vscode.window.createWebviewPanel(
        IssuePanel.viewType,
        "You've Got Issues!",
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );
      IssuePanel.currentPanel = new IssuePanel(panel);
    }

    IssuePanel.currentPanel.setIssue(issue);
  }

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;
  }

  private setIssue(issue: JiraIssue) {
    this.issue = issue;

    let comments = "<h4>Comments<h4>";
    issue.comments.forEach(comment => {
      comments += "<h5>" + comment.author!.displayName + "</h5>";
      comments += "" + comment.comment + "<p>";
    });

    const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
        </head>
        <body>
        <h3>${this.issue.summary}</h3>
        ${this.issue.description}<p>
        <a href="https://${this.issue.jiraURL}">View issue in Jira</a><p>
        ${comments}
        </body>
        </html>
        `;

    this.panel.title = this.issue.summary;
    this.panel.webview.html = html;
  }
}
