import { Atl } from "../atlclients/clientManager";
import { Issue, issueExpand, issueFields, issueFromJsonObject } from "../jira/jiraModel";

const apiConnectivityError = new Error('cannot connect to Jira API');

export async function fetchIssue(issue: string): Promise<Issue> {
  let client = await Atl.jirarequest();

  if (client) {
    return client.issue
      .getIssue({
        issueIdOrKey: issue,
        expand: issueExpand,
        fields: issueFields
      })
      .then((res: JIRA.Response<JIRA.Schema.IssueBean>) => {
        return issueFromJsonObject(res.data, Atl.getWorkingSite());
      });
  }
  return Promise.reject(apiConnectivityError);
}
