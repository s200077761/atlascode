import { Atl } from "../../atlclients/clientManager";
import { JiraIssue } from "../../jira/jiraIssue";

export async function issuesForJQL(jql: string): Promise<JiraIssue[]> {
  let client = await Atl.jirarequest();

  if (client) {
    return client.search
      .searchForIssuesUsingJqlGet({
        expand: "",
        jql: jql,
        fields: JiraIssue.fields
      })
      .then((res: JIRA.Response<JIRA.Schema.SearchResultsBean>) => {
        const issues = res.data.issues;
        if (issues) {
          return issues.map((issue: any) => {
            return JiraIssue.readIssue(issue);
          });
        }
        return [];
      });
  }

  return Promise.reject();
}
