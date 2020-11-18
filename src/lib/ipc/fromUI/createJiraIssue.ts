import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { CommonAction } from './common';

export enum CreateJiraIssueActionType {
    GetCreateMeta = 'getCreateMeta',
}

export type CreateJiraIssueAction =
    | ReducerAction<CreateJiraIssueActionType.GetCreateMeta, GetCreateMetaAction>
    | CommonAction;

export interface GetCreateMetaAction {
    site: DetailedSiteInfo;
    projectKey?: string;
}
