import * as vscode from "vscode";
import { issueOrKey, isIssue } from "../../jira/jiraModel";
import { Container } from "../../container";
import { fetchIssue } from "../../jira/fetchIssue";

export async function showIssue(param: issueOrKey | undefined) {
  let issue = param;

  if (param === undefined) {
    const input = await vscode.window.showInputBox({ prompt: 'Enter issue key' });
    if (input) {
      issue = input.trim();
    }
  }

  if (issue) {
    Container.jiraIssueViewManager.createOrShow(isIssue(issue) ? issue : await fetchIssue(issue));
  }
}
