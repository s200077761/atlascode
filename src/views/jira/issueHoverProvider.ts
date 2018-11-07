import * as vscode from "vscode";

import { HoverProvider } from "vscode";
import { fetchIssue } from "../../jira/fetchIssue";
import { Commands } from "../../commands";

const IssueKeyRegEx = /[A-Z]+-\d+/g;

export class IssueHoverProvider implements HoverProvider {

  provideHover(doc: vscode.TextDocument, position: vscode.Position) {
    let range = doc.getWordRangeAtPosition(position, new RegExp(IssueKeyRegEx));
    if (range === undefined || range.isEmpty) {
      return null;
    }
    let text = doc.getText(range);
    return this.getIssueDetails(text);
  }

  private getIssueDetails(key: string): Promise<vscode.Hover> {
    return fetchIssue(key).then(issue => {
      let text = [];
      text.push(new vscode.MarkdownString(`**${key}: ${issue.summary}**`));
      text.push(new vscode.MarkdownString(`${issue.description}`));
      let encodedURI = encodeURIComponent(JSON.stringify([issue.key]));
      text.push(
        new vscode.MarkdownString(
          `[View](command:${Commands.ShowIssueByKey}?${encodedURI})`
        )
      );
      text[2].isTrusted = true;
      return new vscode.Hover(text);
    });
  }
}
