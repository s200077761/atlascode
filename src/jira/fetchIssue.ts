import { Container } from "../container";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { MinimalIssue } from "./jira-client/model/entities";
import { minimalIssueFromJsonObject } from "./jira-client/issueFromJson";
import { CreateMetaTransformerResult } from "./jira-client/model/createIssueUI";
import { IssueCreateMetadata } from "./jira-client/model/issueCreateMetadata";
import { IssueCreateScreenTransformer } from "./jira-client/issueCreateScreenTransformer";
import { Logger } from "../logger";
import { FieldMeta, readFieldsMeta, Fields, EditMetaDescriptor } from "./jira-client/model/fieldMetadata";
import { IssueEditMetaTransformer } from "./jira-client/issueEditMetaTransformer";
import { FieldTransformerResult } from "./jira-client/model/fieldUI";
import { EditIssueUI } from "./jira-client/model/editIssueUI";

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

export async function fetchEditIssueUI(issue: MinimalIssue): Promise<EditIssueUI> {
  const fieldDescriptor: EditMetaDescriptor = await fetchMetadataForEditUi(issue);

  const transformer: IssueEditMetaTransformer = new IssueEditMetaTransformer(issue.siteDetails);
  const result: FieldTransformerResult = await transformer.transformDescriptor(fieldDescriptor);

  const ui: EditIssueUI = {
    ...result,
    key: issue.key,
    id: issue.id,
    self: issue.self,
    siteDetails: issue.siteDetails,
    isEpic: issue.isEpic,
    epicChildren: issue.epicChildren,

  };

  console.log('edit issue ui', ui);
  return ui;

}

async function fetchMetadataForEditUi(issue: MinimalIssue): Promise<EditMetaDescriptor> {
  const allFields: Fields = await Container.jiraSettingsManager.getAllFieldsForSite(issue.siteDetails);

  const allFieldKeys: string[] = Object.keys(allFields);

  const client = await Container.clientManager.jirarequest(issue.siteDetails);
  const res = await client.getIssue(issue.key, ['*all'], "transitions,renderedFields,editmeta,transitions.fields");
  const metaFields: { [k: string]: FieldMeta } = readFieldsMeta(res.editmeta.fields, res.fields, res.renderedFields);

  const metaFieldKeys: string[] = Object.keys(metaFields);

  let filteredFields: Fields = {};

  Object.keys(res.fields).forEach(fkey => {
    if (res.fields[fkey] !== null && !metaFieldKeys.includes(fkey) && allFieldKeys.includes(fkey)) {
      filteredFields[fkey] = allFields[fkey];
      filteredFields[fkey].currentValue = res.fields[fkey];

      if (res.renderedFields[fkey] && res.renderedFields[fkey] !== null) {
        filteredFields[fkey].renderedValue = res.renderedFields[fkey];
      }
    }
  });

  return { ...metaFields, ...filteredFields };

}