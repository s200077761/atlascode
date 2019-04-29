import { Container } from "../container";
import { Issue, issueExpand, issueFromJsonObject } from "./jiraModel";
import { AccessibleResource } from "../atlclients/authInfo";

const apiConnectivityError = new Error('cannot connect to Jira API');

export async function fetchIssue(issue: string, workingSite?: AccessibleResource): Promise<Issue> {
  let client = await Container.clientManager.jirarequest(workingSite);

  if (client) {
    let site = workingSite;
    if (!site) {
      site = Container.jiraSiteManager.effectiveSite;
    }

    let fields = await Container.jiraFieldManager.getIssueFieldsForSite(site);

    return client.issue
      .getIssue({
        issueIdOrKey: issue,
        expand: issueExpand,
        fields: fields
      })
      .then((res: JIRA.Response<JIRA.Schema.IssueBean>) => {
        return issueFromJsonObject(res.data, workingSite || Container.jiraSiteManager.effectiveSite);
      });
  }
  return Promise.reject(apiConnectivityError);
}
