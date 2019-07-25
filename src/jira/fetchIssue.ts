import { Container } from "../container";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { issueFromJsonObject } from "./jira-client/issueFromJson";
import { DetailedIssue } from "./jira-client/model/detailedJiraIssue";
import { MinimalIssue } from "./jira-client/model/entities";


export async function fetchDetailedIssue(issue: string, siteDetails: DetailedSiteInfo): Promise<DetailedIssue> {
  const fields = await Container.jiraSettingsManager.getDetailedIssueFieldIdsForSite(siteDetails);
  const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(siteDetails);

  const issuesJson = await fetchIssue(issue, fields, siteDetails);

  return issueFromJsonObject(issuesJson, siteDetails, epicFieldInfo);
}

export async function fetchMinimalIssue(issue: string, siteDetails: DetailedSiteInfo): Promise<MinimalIssue> {
  const fields = await Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(siteDetails);
  const client = await Container.clientManager.jirarequest(siteDetails);

  return await client.getIssue(issue, fields);
}

async function fetchIssue(issue: string, fields: string[], siteDetails: DetailedSiteInfo): Promise<any> {
  const client = await Container.clientManager.jirarequest(siteDetails);

  const issuesJson = 

  return issuesJson;
}
