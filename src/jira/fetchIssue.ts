import { Container } from "../container";
import { Issue, issueExpand, issueFromJsonObject } from "./jiraModel";
import { DetailedSiteInfo } from "../atlclients/authInfo";


export async function fetchIssue(issue: string, siteDetails: DetailedSiteInfo): Promise<Issue> {
  const client = await Container.clientManager.jirarequest(siteDetails);
  const fields = await Container.jiraFieldManager.getOrderableFieldIdsForSite(siteDetails);
  const epicFieldInfo = await Container.jiraFieldManager.getEpicFieldsForSite(siteDetails);

  return client.issue
    .getIssue({
      issueIdOrKey: issue,
      expand: issueExpand,
      fields: fields
    })
    .then((res: JIRA.Response<JIRA.Schema.IssueBean>) => {
      return issueFromJsonObject(res.data, siteDetails, epicFieldInfo);
    });
}
