import * as vscode from "vscode";
import { Container } from "../../container";
import { MinimalIssueOrKey, isMinimalIssue, MinimalIssue } from "../../jira/jira-client/model/entities";
import { DetailedSiteInfo, emptySiteInfo, ProductJira } from "../../atlclients/authInfo";
import { fetchMinimalIssue } from "../../jira/fetchIssue";

export async function showIssue(issueOrKey: MinimalIssueOrKey | undefined) {
  let issueKey: string = "";
  let site: DetailedSiteInfo = emptySiteInfo;
  let issue: MinimalIssue | undefined = undefined;

  if (isMinimalIssue(issueOrKey)) {
    issue = issueOrKey;
  } else {
    if (issueOrKey === undefined) {
      const input = await vscode.window.showInputBox({ prompt: 'Enter issue key' });
      if (input) {
        issueKey = input.trim();
        site = Container.siteManager.effectiveSite(ProductJira);
      }
    } else {
      issueKey = issueOrKey;
      site = Container.siteManager.effectiveSite(ProductJira);
    }

    issue = await fetchMinimalIssue(issueKey, site);
  }


  Container.jiraIssueViewManager.createOrShow(issue);
}

