import { Container } from "../container";
import { Issue, issueExpand, issueTreeviewExpand } from "./jiraModel";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { issueFromJsonObject } from "./issueFromJson";


export async function fetchIssue(issue: string, siteDetails: DetailedSiteInfo): Promise<Issue> {
  const client = await Container.clientManager.jirarequest(siteDetails);
  const fields = await Container.jiraFieldManager.getTreeviewFieldIdsForSite(siteDetails);
  const epicFieldInfo = await Container.jiraFieldManager.getEpicFieldsForSite(siteDetails);

  const res = await client.issue.getIssue({
    issueIdOrKey: issue,
    expand: issueExpand,
    fields: fields
  });

  return await issueFromJsonObject(res.data, siteDetails, epicFieldInfo);
}

export async function fetchIssueForTreeview(issue: string, siteDetails: DetailedSiteInfo): Promise<Issue> {
  const client = await Container.clientManager.jirarequest(siteDetails);
  const fields = await Container.jiraFieldManager.getTreeviewFieldIdsForSite(siteDetails);
  const epicFieldInfo = await Container.jiraFieldManager.getEpicFieldsForSite(siteDetails);

  const res = await client.issue.getIssue({
    issueIdOrKey: issue,
    expand: issueTreeviewExpand,
    fields: fields
  });

  return await issueFromJsonObject(res.data, siteDetails, epicFieldInfo);

}