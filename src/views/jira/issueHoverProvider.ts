import * as vscode from "vscode";

import { HoverProvider } from "vscode";
import { fetchIssue } from "../../jira/fetchIssue";
import { Commands } from "../../commands";
import { viewScreenEvent } from "../../analytics";
import { Container } from "../../container";

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
    // TODO: make sure the key exists in our list of known project before we try to fetch the issue
    // e.g. if the issue key is in a different site, or is completely made up, we shouldn't fetch.
    return fetchIssue(key).then(issue => {
      let summaryText = issue.summary ? issue.summary : "";
      let statusText = issue.status.name;
      let descriptionText = issue.description ? issue.description : "*No description*";
      let header = 
      `| ![](${issue.issueType.iconUrl})                        | ${key}: ${summaryText} |
       | -                                                      | -                      |
       | ![](${issue.priority.iconUrl.replace(".svg", ".png")}) | ${issue.priority.name} |
       |                                                        | ${statusText}          |`;

      let text = [];
      text.push(new vscode.MarkdownString(header));
      text.push(new vscode.MarkdownString(descriptionText));
      let encodedKey = encodeURIComponent(JSON.stringify([key]));

      text.push( new vscode.MarkdownString(`[Open Issue View](command:${Commands.ShowIssue}?${encodedKey} "View Issue")`));
      text[text.length - 1].isTrusted = true;

      viewScreenEvent('issueHover').then(e => { Container.analyticsClient.sendScreenEvent(e); });
      
      return new vscode.Hover(text);
    });
  }
}
