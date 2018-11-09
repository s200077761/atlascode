import { Atl } from "../../atlclients/clientManager";
import { Issue, issueExpand, issueFields, issueFromJsonObject } from "../..//jira/jiraModel";


export async function issuesForJQL(jql: string): Promise<Issue[]> {
  let client = await Atl.jirarequest();

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
            return issueFromJsonObject(issue);
          });
        }
        return [];
      });
  }

  return Promise.reject();
}
