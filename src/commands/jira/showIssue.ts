import * as vscode from "vscode";
import { Container } from "../../container";
import { MinimalIssueOrKey, isMinimalIssue } from "../../jira/jira-client/model/entities";
import { DetailedSiteInfo, emptySiteInfo, ProductJira } from "../../atlclients/authInfo";

export async function showIssue(issueOrKey: MinimalIssueOrKey | undefined) {
  let issueKey: string = "";
  let site: DetailedSiteInfo = emptySiteInfo;

  if (issueOrKey === undefined) {
    const input = await vscode.window.showInputBox({ prompt: 'Enter issue key' });
    if (input) {
      issueKey = input.trim();
      site = Container.siteManager.effectiveSite(ProductJira);
    }
  } else if (isMinimalIssue(issueOrKey)) {
    issueKey = issueOrKey.key;
    site = issueOrKey.siteDetails;
  } else {
    issueKey = issueOrKey;
    site = Container.siteManager.effectiveSite(ProductJira);
  }

  Container.jiraIssueViewManager.createOrShow({ issueKey: issueKey, site: site });
}

