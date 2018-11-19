import { Container } from "../container";
import { Issue, issueExpand, issueFields, issueFromJsonObject } from "../jira/jiraModel";

const apiConnectivityError = new Error('cannot connect to Jira API');

export async function fetchIssue(issue: string): Promise<Issue> {
  let client = await Container.clientManager.jirarequest();

  if (client) {
    return client.issue
      .getIssue({
        issueIdOrKey: issue,
        expand: issueExpand,
        fields: issueFields
      })
      .then((res: JIRA.Response<JIRA.Schema.IssueBean>) => {
        return issueFromJsonObject(res.data, Container.config.jira.workingSite);
      });
  }
  return Promise.reject(apiConnectivityError);
}
