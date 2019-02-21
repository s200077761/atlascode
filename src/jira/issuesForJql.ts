import { Container } from "../container";
import { Issue, issueExpand, issueFields, issueFromJsonObject } from "./jiraModel";

export async function issuesForJQL(jql: string): Promise<Issue[]> {
  let client = await Container.clientManager.jirarequest();

  if (client) {
    return client.search
      .searchForIssuesUsingJqlGet({
        expand: issueExpand,
        jql: jql,
        fields: issueFields
      })
      .then((res: JIRA.Response<JIRA.Schema.SearchResultsBean>) => {
        const issues = res.data.issues;
        if (issues) {
          return issues.map((issue: any) => {
            return issueFromJsonObject(issue, Container.jiraSiteManager.effectiveSite);
          });
        }
        return [];
      });
  } else {
  }

  return Promise.reject();
}
