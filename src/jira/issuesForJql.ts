import { MinimalIssue, readSearchResults } from "jira-pi-client";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { Container } from "../container";


export async function issuesForJQL(jql: string, site: DetailedSiteInfo): Promise<MinimalIssue<DetailedSiteInfo>[]> {
  const client = await Container.clientManager.jiraClient(site);
  const fields = await Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(site);
  const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(site);

  const res = await client.searchForIssuesUsingJqlGet(jql, fields);
  const searchResults = await readSearchResults(res, site, epicFieldInfo);

  return searchResults.issues;
}
