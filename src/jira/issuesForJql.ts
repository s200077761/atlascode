import { Container } from "../container";
import { Issue, issueExpand, issueFromJsonObject } from "./jiraModel";

export async function issuesForJQL(jql: string): Promise<Issue[]> {
  let client = await Container.clientManager.jirarequest();

  if (client) {

    let site = Container.jiraSiteManager.effectiveSite;
    let fields = await Container.jiraFieldManager.getIssueFieldsForSite(site);
    let epicFieldInfo = await Container.jiraFieldManager.getEpicFieldsForSite(site);

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
  } else {
  }

  return Promise.reject();
}
