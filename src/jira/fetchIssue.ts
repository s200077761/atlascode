import { Atl } from "../atlclients/clientManager";
import { JiraIssue } from "./jiraIssue";

const apiConnectivityError = new Error('cannot connect to Jira API');

export async function fetchIssue(issue: string): Promise<JiraIssue> {
  let client = await Atl.jirarequest();

  if (client) {
    return client.issue
      .getIssue({
        issueIdOrKey: issue,
        expand: "",
        fields: JiraIssue.fields
      })
      .then((res: JIRA.Response<JIRA.Schema.IssueBean>) => {
        return JiraIssue.readIssue(res.data);
      });
  }
  return Promise.reject(apiConnectivityError);
}
