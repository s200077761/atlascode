import * as vscode from "vscode";
import { Container } from "../../container";
import { isMinimalIssue, MinimalIssue, MinimalIssueOrKeyAndSiteOrKey, isIssueKeyAndSite } from "../../jira/jira-client/model/entities";
import { DetailedSiteInfo, emptySiteInfo, ProductJira } from "../../atlclients/authInfo";
import { fetchMinimalIssue, getCachedOrFetchMinimalIssue } from "../../jira/fetchIssue";

export async function showIssue(issueOrKey: MinimalIssueOrKeyAndSiteOrKey | undefined) {
  let issueKey: string = "";
  let site: DetailedSiteInfo = emptySiteInfo;
  let issue: MinimalIssue | undefined = undefined;

  if (isMinimalIssue(issueOrKey)) {
    issue = issueOrKey;
  } else {
    if (isIssueKeyAndSite(issueOrKey)) {
      issueKey = issueOrKey.key;
      site = issueOrKey.siteDetails;
    } else if (issueOrKey === undefined) {
      const input = await vscode.window.showInputBox({ prompt: 'Enter issue key' });
      if (input) {
        issueKey = input.trim();
        site = Container.siteManager.effectiveSite(ProductJira);
      }
    } else {
      issueKey = issueOrKey;
      site = Container.siteManager.effectiveSite(ProductJira);
    }

    // Note: we try to get the cached issue first because it will contain epic child info we need
    const cachedOrFetched = await getCachedOrFetchMinimalIssue(issueKey, site);
    if (cachedOrFetched && isMinimalIssue(cachedOrFetched)) {
      issue = cachedOrFetched;
    } else {
      issue = await fetchMinimalIssue(issueKey, site);
    }
  }

  Container.jiraIssueViewManager.createOrShow(issue);
}

