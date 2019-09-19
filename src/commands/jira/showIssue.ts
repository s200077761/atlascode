import * as vscode from "vscode";
import { Container } from "../../container";
import { isMinimalIssue, MinimalIssue, MinimalIssueOrKeyAndSite, isIssueKeyAndSite } from "../../jira/jira-client/model/entities";
import { DetailedSiteInfo, emptySiteInfo, ProductJira } from "../../atlclients/authInfo";
import { fetchMinimalIssue, getCachedOrFetchMinimalIssue } from "../../jira/fetchIssue";
import { issueNotFoundIssue } from "../../jira/jira-client/model/emptyEntities";
import { issueForKey } from "../../jira/issueForKey";

export async function showIssue(issueOrKeyAndSite: MinimalIssueOrKeyAndSite) {
  let issueKey: string = "";
  let site: DetailedSiteInfo = emptySiteInfo;
  let issue: MinimalIssue = issueNotFoundIssue;

  if (isMinimalIssue(issueOrKeyAndSite)) {
    issue = issueOrKeyAndSite;
  } else {
    if (isIssueKeyAndSite(issueOrKeyAndSite)) {
      issueKey = issueOrKeyAndSite.key;
      site = issueOrKeyAndSite.siteDetails;
    } else {
      Container.jiraIssueViewManager.createOrShow(issueNotFoundIssue);
      return;
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
export async function showIssueForSiteIdAndKey(siteId: string, issueKey: string) {
  let issue: MinimalIssue = issueNotFoundIssue;
  const site: DetailedSiteInfo | undefined = Container.siteManager.getSiteForId(ProductJira, siteId);

  if (site) {
    const cachedOrFetched = await getCachedOrFetchMinimalIssue(issueKey, site);
    if (cachedOrFetched && isMinimalIssue(cachedOrFetched)) {
      issue = cachedOrFetched;
    } else {
      issue = await fetchMinimalIssue(issueKey, site);
    }
  }

  Container.jiraIssueViewManager.createOrShow(issue);
}

export async function showIssueForKey(issueKey?: string) {
  let issue: MinimalIssue = issueNotFoundIssue;

  if (issueKey === undefined) {
    const input = await vscode.window.showInputBox({ prompt: 'Enter issue key' });
    if (input) {
      issueKey = input.trim();
    }
  } else {
    issueKey = issueKey;
  }

  if (issueKey) {
    try {
      issue = await issueForKey(issueKey);
    } catch (e) {
      //not found
    }

  }

  Container.jiraIssueViewManager.createOrShow(issue);
}

