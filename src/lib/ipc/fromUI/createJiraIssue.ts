import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { CommonAction } from './common';

export enum CreateJiraIssueActionType {
    GetCreateMeta = 'getCreateMeta',
    CreateIssueRequest = 'createIssueRequest',
}

export type CreateJiraIssueAction =
    | ReducerAction<CreateJiraIssueActionType.GetCreateMeta, GetCreateMetaAction>
    | ReducerAction<CreateJiraIssueActionType.CreateIssueRequest, CreateIssueRequest>
    | CommonAction;

export interface GetCreateMetaAction {
    site: DetailedSiteInfo;
    projectKey?: string;
}

export interface CreateIssueRequest {
    site: DetailedSiteInfo;
    issueData: FieldValues;
}
