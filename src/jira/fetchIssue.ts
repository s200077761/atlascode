import { Atl } from "../atlclients/clientManager";
import { JiraIssue } from "../jira/jiraIssue";

const apiConnectivityError = new Error('cannot connect to Jira API');

export async function fetchIssue(issue: string): Promise<JiraIssue.Issue> {
  let client = await Atl.jirarequest();

  if (client) {
    return client.issue
      .getIssue({
        issueIdOrKey: issue,
        expand: JiraIssue.expand,
        fields: JiraIssue.issueFields
      })
      .then((res: JIRA.Response<JIRA.Schema.IssueBean>) => {
        return JiraIssue.fromJsonObject(res.data);
      });
  }
  return Promise.reject(apiConnectivityError);
}
