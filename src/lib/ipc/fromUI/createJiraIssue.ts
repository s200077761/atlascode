import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { FieldUI, FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { CommonAction } from './common';

export enum CreateJiraIssueActionType {
    GetCreateMeta = 'getCreateMeta',
    CreateIssueRequest = 'createIssueRequest',
    AutoCompleteQuery = 'autoCompleteQuery',
}

export type CreateJiraIssueAction =
    | ReducerAction<CreateJiraIssueActionType.GetCreateMeta, GetCreateMetaAction>
    | ReducerAction<CreateJiraIssueActionType.CreateIssueRequest, CreateIssueRequest>
    | ReducerAction<CreateJiraIssueActionType.AutoCompleteQuery, AutoCompleteAction>
    | CommonAction;

export interface GetCreateMetaAction {
    site: DetailedSiteInfo;
    projectKey?: string;
}

export interface CreateIssueRequest {
    site: DetailedSiteInfo;
    issueData: FieldValues;
}

export interface AutoCompleteAction {
    site: DetailedSiteInfo;
    field: FieldUI;
    autoCompleteQuery: string;
    url: string;
}
