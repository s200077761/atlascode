import { Container } from "../container";
import { Issue, issueExpand, issueFields, issueFromJsonObject } from "../jira/jiraModel";
import { Logger } from "../logger";
import { WorkingSite } from "../config/model";

const apiConnectivityError = new Error('cannot connect to Jira API');

export async function fetchIssue(issue: string, workingSite?: WorkingSite): Promise<Issue> {
  Logger.debug('fetch issue is calling jirarequest');
  let client = await Container.clientManager.jirarequest(workingSite);

  if (client) {
    return client.issue
      .getIssue({
        issueIdOrKey: issue,
        expand: issueExpand,
        fields: issueFields
      })
      .then((res: JIRA.Response<JIRA.Schema.IssueBean>) => {
        return issueFromJsonObject(res.data, workingSite || Container.jiraSiteManager.effectiveSite);
      });
  }
  return Promise.reject(apiConnectivityError);
}
