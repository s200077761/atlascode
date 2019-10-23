import { Container } from "../container";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { MinimalIssue, MinimalORIssueLink, IssueLinkType, isMinimalIssue } from "./jira-client/model/entities";
import { minimalIssueFromJsonObject } from "./jira-client/issueFromJson";
import { CreateIssueScreenTransformer, Fields, EditIssueScreenTransformer, FieldTransformerResult } from 'jira-metaui-transformer';
import { API_VERSION } from "./jira-client/client";
import { CreateMetaTransformerResult } from "jira-metaui-transformer";
import { IssueCreateMetadata } from "jira-metaui-transformer";
import { EditIssueUI } from "./jira-client/model/editIssueUI";
import { emptyProjectIssueCreateMetadata } from "./jira-client/model/emptyEntities";

export async function fetchCreateIssueUI(siteDetails: DetailedSiteInfo, projectKey: string): Promise<CreateMetaTransformerResult<DetailedSiteInfo>> {
  const client = await Container.clientManager.jiraClient(siteDetails);
  const allFields: Fields = await Container.jiraSettingsManager.getAllFieldsForSite(siteDetails);
  const issueLinkTypes: IssueLinkType[] = await Container.jiraSettingsManager.getIssueLinkTypes(siteDetails);
  const createIssueTransformer: CreateIssueScreenTransformer<DetailedSiteInfo> = new CreateIssueScreenTransformer(siteDetails, '2', allFields, issueLinkTypes);

  const meta: IssueCreateMetadata = await client.getCreateIssueMetadata(projectKey);

  if (!Array.isArray(meta.projects) || meta.projects.length < 1) {
    meta.projects = [emptyProjectIssueCreateMetadata];
    meta.projects[0].issuetypes[0].fields['project'] = {
      id: 'project',
      key: 'project',
      name: 'Project',
      schema: {
        type: 'project',
        system: 'project',
        custom: undefined,
        items: undefined,
      },
      required: true,
      autoCompleteUrl: undefined,
      allowedValues: [],
    };
  }

  return await createIssueTransformer.transformIssueScreens(meta.projects[0]);

}

export async function getCachedOrFetchMinimalIssue(issueKey: string, siteDetails: DetailedSiteInfo): Promise<MinimalORIssueLink> {
  let foundIssue = await getCachedIssue(issueKey);

  if (!foundIssue) {
    foundIssue = await fetchMinimalIssue(issueKey, siteDetails);
  }

  return foundIssue;
}

export async function getCachedIssue(issueKey: string): Promise<MinimalORIssueLink | undefined> {
  return await Container.jiraExplorer.findIssue(issueKey);
}

export async function fetchMinimalIssue(issue: string, siteDetails: DetailedSiteInfo): Promise<MinimalIssue> {
  const fields = await Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(siteDetails);
  const client = await Container.clientManager.jiraClient(siteDetails);

  const res = await client.getIssue(issue, fields);
  return minimalIssueFromJsonObject(res, siteDetails, await Container.jiraSettingsManager.getEpicFieldsForSite(siteDetails));
}

export async function fetchEditIssueUI(issue: MinimalIssue): Promise<EditIssueUI> {
  const allFields: Fields = await Container.jiraSettingsManager.getAllFieldsForSite(issue.siteDetails);
  const issueLinkTypes: IssueLinkType[] = await Container.jiraSettingsManager.getIssueLinkTypes(issue.siteDetails);

  const client = await Container.clientManager.jiraClient(issue.siteDetails);
  const issueResp = await client.getIssue(issue.key, ['*all'], "transitions,renderedFields,editmeta,transitions.fields");
  const projectKey = issue.key.substring(0, issue.key.indexOf('-'));
  const cMeta: IssueCreateMetadata = await client.getCreateIssueMetadata(projectKey);

  const transformer: EditIssueScreenTransformer<DetailedSiteInfo> = new EditIssueScreenTransformer(issue.siteDetails, '2', allFields, issueLinkTypes);
  const epicNameProvider = async (key: string) => {
    const epicIssue = await getCachedIssue(key);
    if (isMinimalIssue(epicIssue)) {
      return epicIssue.epicName;
    }

    return undefined;
  };

  const result: FieldTransformerResult = await transformer.transformIssue(issueResp, cMeta, epicNameProvider);

  const ui: EditIssueUI = {
    ...result,
    key: issue.key,
    id: issue.id,
    self: issue.self,
    siteDetails: issue.siteDetails,
    isEpic: issue.isEpic,
    epicChildren: issue.epicChildren,
    epicFieldInfo: await Container.jiraSettingsManager.getEpicFieldsForSite(issue.siteDetails),
    apiVersion: API_VERSION,

  };

  return ui;

}
