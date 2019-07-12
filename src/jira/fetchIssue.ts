import { Container } from "../container";
import { DetailedIssue, issueExpand } from "./jiraModel";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { issueFromJsonObject, minimalIssueFromJsonObject } from "./issueFromJson";
import { MinimalIssue } from "./minimalJiraIssue";

export async function fetchDetailedIssue(issue: string, siteDetails: DetailedSiteInfo): Promise<DetailedIssue> {
  const client = await Container.clientManager.jirarequest(siteDetails);
  const fields = await Container.jiraFieldManager.getDetailedIssueFieldIdsForSite(siteDetails);
  const epicFieldInfo = await Container.jiraFieldManager.getEpicFieldsForSite(siteDetails);

  const res = await client.issue.getIssue({
    issueIdOrKey: issue,
    expand: issueExpand,
    fields: fields
  });

  return issueFromJsonObject(res.data, siteDetails, epicFieldInfo);
}

export async function fetchMinimalIssue(issue: string, siteDetails: DetailedSiteInfo): Promise<MinimalIssue> {
  const client = await Container.clientManager.jirarequest(siteDetails);
  const fields = await Container.jiraFieldManager.getMinimalIssueFieldIdsForSite(siteDetails);
  const epicFieldInfo = await Container.jiraFieldManager.getEpicFieldsForSite(siteDetails);

  const res = await client.issue.getIssue({
    issueIdOrKey: issue,
    expand: issueExpand,
    fields: fields
  });

  return minimalIssueFromJsonObject(res.data, siteDetails, epicFieldInfo);

}