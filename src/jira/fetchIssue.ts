import { Container } from "../container";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { MinimalIssue } from "./jira-client/model/entities";
import { minimalIssueFromJsonObject } from "./jira-client/issueFromJson";
import { CreateMetaTransformerResult } from "./jira-client/model/createIssueUI";
import { IssueCreateMetadata } from "./jira-client/model/issueCreateMetadata";
import { IssueCreateScreenTransformer } from "./jira-client/issueCreateScreenTransformer";
import { Logger } from "../logger";


export async function fetchCreateIssueUI(siteDetails: DetailedSiteInfo, projectKey: string): Promise<CreateMetaTransformerResult> {
  const client = await Container.clientManager.jirarequest(siteDetails);
  const createIssueTransformer: IssueCreateScreenTransformer = new IssueCreateScreenTransformer(siteDetails);

  Logger.debug('loading creat meta', projectKey);
  const meta: IssueCreateMetadata = await client.getCreateIssueMetadata(projectKey);
  Logger.debug('got meta', meta);

  Logger.debug('transforming meta...');
  return await createIssueTransformer.transformIssueScreens(meta.projects[0]);

}

export async function fetchMinimalIssue(issue: string, siteDetails: DetailedSiteInfo): Promise<MinimalIssue> {
  const fields = await Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(siteDetails);
  const client = await Container.clientManager.jirarequest(siteDetails);

  const res = await client.getIssue(issue, fields);
  return minimalIssueFromJsonObject(res, siteDetails, await Container.jiraSettingsManager.getEpicFieldsForSite(siteDetails));
}

