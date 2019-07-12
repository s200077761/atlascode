import * as vscode from "vscode";
import { detailedIssueOrKey, isDetailedIssue } from "../../jira/jiraModel";
import { Container } from "../../container";
import { fetchIssue } from "../../jira/fetchIssue";
import { ProductJira } from "../../atlclients/authInfo";

export async function showIssue(param: detailedIssueOrKey | undefined) {
  let issue = param;

  if (param === undefined) {
    const input = await vscode.window.showInputBox({ prompt: 'Enter issue key' });
    if (input) {
      issue = input.trim();
    }
  }

  if (issue) {
    Container.jiraIssueViewManager.createOrShow(isDetailedIssue(issue) ? issue : await fetchIssue(issue, Container.siteManager.effectiveSite(ProductJira)));
  }
}
