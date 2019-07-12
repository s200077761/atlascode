import { Container } from "../container";
import { Issue, issueExpand } from "./jiraModel";
import { ProductJira } from "../atlclients/authInfo";
import { issueFromJsonObject } from "./issueFromJson";

export async function issuesForJQL(jql: string): Promise<Issue[]> {
  const site = Container.siteManager.effectiveSite(ProductJira);

  const client = await Container.clientManager.jirarequest(site);
  const fields = await Container.jiraFieldManager.getTreeviewFieldIdsForSite(site);
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
      return issueFromJsonObject(issue, site, epicFieldInfo);
    });
  }

  return [];

}
