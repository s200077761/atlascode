import { Atl } from "../../atlclients/clientManager";
import { JiraIssue } from "../../jira/jiraIssue";

const fields = ["summary", "description", "comment", "issuetype"];

export async function issuesForJQL(jql: string): Promise<JiraIssue[]> {
  let client = await Atl.jirarequest();

  if (client) {
    return client.search
      .searchForIssuesUsingJqlGet({
        expand: "",
        jql: jql,
        fields: fields
      })
      .then((res: JIRA.Response<JIRA.Schema.Any>) => {
        const issues = res.data.issues;
        return issues
          .map((issue: any) => {
            return JiraIssue.readIssue(issue);
          });
      });
  }

  return Promise.reject();
}
