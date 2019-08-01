import { Container } from "../container";
import { DetailedSiteInfo, ProductJira } from "../atlclients/authInfo";
import { MinimalIssue } from "./jira-client/model/entities";
import { minimalIssueFromJsonObject } from "./jira-client/issueFromJson";
import { CreateMetaTransformerResult } from "./jira-client/model/createIssueUI";
import { IssueCreateMetadata } from "./jira-client/model/issueCreateMetadata";
import { IssueCreateScreenTransformer } from "./jira-client/issueCreateScreenTransformer";
import { Logger } from "../logger";
import { FieldMeta, readFieldsMeta, Fields, EditMetaDescriptor } from "./jira-client/model/fieldMetadata";
import { IssueEditMetaTransformer } from "./jira-client/issueEditMetaTransformer";
import { EditMetaTransformerResult } from "./jira-client/model/editIssueUI";


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

export async function fetchEditIssueUI(issueKey: string, siteDetails?: DetailedSiteInfo): Promise<void> {
  let site = siteDetails;

  if (!site) {
    site = Container.siteManager.effectiveSite(ProductJira);
  }

  const fieldDescriptor: EditMetaDescriptor = await fetchMetadataForEditUi(issueKey, site);

  //console.log(JSON.stringify(fieldDescriptor));
  const transformer: IssueEditMetaTransformer = new IssueEditMetaTransformer(site);
  const result: EditMetaTransformerResult = await transformer.transformDescriptor(fieldDescriptor);

  console.log(JSON.stringify(result));

  // const edite: IssueCreateScreenTransformer = new IssueCreateScreenTransformer(siteDetails);

  // Logger.debug('loading creat meta', projectKey);
  // const meta: IssueCreateMetadata = await client.getCreateIssueMetadata(projectKey);
  // Logger.debug('got meta', meta);

  // Logger.debug('transforming meta...');
  // return await createIssueTransformer.transformIssueScreens(meta.projects[0]);

}

async function fetchMetadataForEditUi(issueKey: string, site: DetailedSiteInfo): Promise<EditMetaDescriptor> {
  const allFields: Fields = await Container.jiraSettingsManager.getAllFieldsForSite(site);
  const allFieldKeys: string[] = Object.keys(allFields);

  const client = await Container.clientManager.jirarequest(site);
  const res = await client.getIssue(issueKey, ['*all'], "transitions,renderedFields,editmeta,transitions.fields");
  const metaFields: { [k: string]: FieldMeta } = readFieldsMeta(res.editmeta.fields, res.fields);

  const metaFieldKeys: string[] = Object.keys(metaFields);

  let filteredFields: Fields = {};

  Object.keys(res.fields).forEach(fkey => {
    if (res.fields[fkey] !== null && !metaFieldKeys.includes(fkey) && allFieldKeys.includes(fkey)) {
      filteredFields[fkey] = allFields[fkey];
      filteredFields[fkey].currentValue = res.fields[fkey];
    }
  });

  return { ...metaFields, ...filteredFields };
}