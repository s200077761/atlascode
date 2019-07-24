import { Container } from "../container";
import { DetailedIssue } from "./jiraModel";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { issueFromJsonObject, minimalIssueFromJsonObject } from "./issueFromJson";
import { MinimalIssue } from "./minimalJiraIssue";

export async function fetchDetailedIssue(issue: string, siteDetails: DetailedSiteInfo): Promise<DetailedIssue> {
  const fields = await Container.jiraSettingsManager.getDetailedIssueFieldIdsForSite(siteDetails);
  const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(siteDetails);

  const issuesJson = await fetchIssue(issue, fields, siteDetails);

  return issueFromJsonObject(issuesJson, siteDetails, epicFieldInfo);
}

export async function fetchMinimalIssue(issue: string, siteDetails: DetailedSiteInfo): Promise<MinimalIssue> {
  const fields = await Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(siteDetails);
  const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(siteDetails);

  const issuesJson = await fetchIssue(issue, fields, siteDetails);

  return minimalIssueFromJsonObject(res.data, siteDetails, epicFieldInfo);

async function fetchIssue(issue: string, fields: string[], siteDetails: DetailedSiteInfo): Promise<any> {
  const client = await Container.clientManager.jirarequest(siteDetails);

  const issuesJson = await client.getIssue(issue, fields);

  return issuesJson;
}
