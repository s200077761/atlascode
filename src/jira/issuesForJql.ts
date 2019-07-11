import { Container } from "../container";
import { ProductJira } from "../atlclients/authInfo";
import { MinimalIssue } from "./minimalJiraIssue";
import { readSearchResults } from "./jira-client/searchResults";

export async function issuesForJQL(jql: string): Promise<MinimalIssue[]> {
  const site = Container.siteManager.effectiveSite(ProductJira);

  const client = await Container.clientManager.jirarequest(site);
  const fields = await Container.jiraFieldManager.getMinimalIssueFieldIdsForSite(site);
  const epicFieldInfo = await Container.jiraFieldManager.getEpicFieldsForSite(site);

  const res = await client.searchForIssuesUsingJqlGet(jql, fields);
  const searchResults = await readSearchResults(res, site, epicFieldInfo);

  return searchResults.issues;
}
