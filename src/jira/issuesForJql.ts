import { Container } from "../container";
import { ProductJira } from "../atlclients/authInfo";
import { minimalIssueFromJsonObject } from "./issueFromJson";
import { MinimalIssue } from "./minimalJiraIssue";
import { issueExpand } from "./detailedJiraIssue";

export async function issuesForJQL(jql: string): Promise<MinimalIssue[]> {
  const site = Container.siteManager.effectiveSite(ProductJira);

  const client = await Container.clientManager.jirarequest(site);
  const fields = await Container.jiraFieldManager.getMinimalIssueFieldIdsForSite(site);
  const epicFieldInfo = await Container.jiraFieldManager.getEpicFieldsForSite(site);

  const res = await client.search
    .searchForIssuesUsingJqlGet({
      expand: issueExpand,
      jql: jql,
      fields: fields
    });

  const issues = res.data.issues;
  if (issues) {
    return issues.map((issue: any) => {
      return minimalIssueFromJsonObject(issue, site, epicFieldInfo);
    });
  }

  return [];

}
