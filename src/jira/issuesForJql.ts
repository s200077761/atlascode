import { Container } from "../container";
import { Issue, issueExpand, issueFromJsonObject } from "./jiraModel";
import { ProductJira } from "../atlclients/authInfo";

export async function issuesForJQL(jql: string): Promise<Issue[]> {
  const site = Container.siteManager.effectiveSite(ProductJira);

  const client = await Container.clientManager.jirarequest(site);
  const fields = await Container.jiraFieldManager.getIssueFieldsForSite(site);
  const epicFieldInfo = await Container.jiraFieldManager.getEpicFieldsForSite(site);

  return client.search
    .searchForIssuesUsingJqlGet({
      expand: issueExpand,
      jql: jql,
      fields: fields
    })
    .then((res: JIRA.Response<JIRA.Schema.SearchResultsBean>) => {
      const issues = res.data.issues;
      if (issues) {
        return issues.map((issue: any) => {
          return issueFromJsonObject(issue, site, epicFieldInfo);
        });
      }
      return [];
    });
}
