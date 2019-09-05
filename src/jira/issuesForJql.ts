import { Container } from "../container";
import { ProductJira, DetailedSiteInfo } from "../atlclients/authInfo";
import { MinimalIssue } from "./jira-client/model/entities";
import { readSearchResults } from "./jira-client/model/responses";


export async function issuesForJQL(jql: string, site?: DetailedSiteInfo): Promise<MinimalIssue[]> {
  let effSite = site;
  if (!effSite) {
    effSite = Container.siteManager.effectiveSite(ProductJira);
  }

  const client = await Container.clientManager.jiraClient(effSite);
  const fields = await Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(effSite);
  const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(effSite);

  const res = await client.searchForIssuesUsingJqlGet(jql, fields);
  const searchResults = await readSearchResults(res, effSite, epicFieldInfo);

  return searchResults.issues;
}
