import { Container } from "../container";
import { Issue, issueExpand, issueFromJsonObject } from "./jiraModel";
import { AccessibleResource } from "../atlclients/authInfo";

const apiConnectivityError = new Error('cannot connect to Jira API');

export async function fetchIssue(issue: string, workingSite?: AccessibleResource): Promise<Issue> {
  let client = await Container.clientManager.jirarequest(workingSite);

  if (client) {
    let site = Container.jiraSiteManager.effectiveSite;
    if (workingSite) {
      site = workingSite;
    }

    let fields = await Container.jiraFieldManager.getIssueFieldsForSite(site);
    let epicFieldInfo = await Container.jiraFieldManager.getEpicFieldsForSite(site);

    return client.issue
      .getIssue({
        issueIdOrKey: issue,
        expand: issueExpand,
        fields: fields
      })
      .then((res: JIRA.Response<JIRA.Schema.IssueBean>) => {
        return issueFromJsonObject(res.data, site, epicFieldInfo);
      });
  }
  return Promise.reject(apiConnectivityError);
}
