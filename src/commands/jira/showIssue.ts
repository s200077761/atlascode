import * as vscode from "vscode";
import { Container } from "../../container";

export async function showIssue(issueKey: string | undefined) {
  let key: string = "";

  if (issueKey === undefined) {
    const input = await vscode.window.showInputBox({ prompt: 'Enter issue key' });
    if (input) {
      key = input.trim();
    }
  } else {
    key = issueKey;
  }

  Container.jiraIssueViewManager.createOrShow(key);
}
