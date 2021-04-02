import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { emptyIssueType, emptyProject, IssueKeyAndSite, Project } from '@atlassianlabs/jira-pi-common-models';
import { CreateMetaTransformerResult, FieldUI } from '@atlassianlabs/jira-pi-meta-models';
import { DetailedSiteInfo, emptySiteInfo } from '../../../atlclients/authInfo';

export enum CreateJiraIssueMessageType {
    Init = 'init',
    CreateIssueResponse = 'createIssueResponse',
    Update = 'update',
}

export type CreateJiraIssueMessage =
    | ReducerAction<CreateJiraIssueMessageType.Init, CreateJiraIssueInitMessage>
    | ReducerAction<CreateJiraIssueMessageType.CreateIssueResponse, CreateIssueResponseMessage>
    | ReducerAction<CreateJiraIssueMessageType.Update, CreateJiraIssueUpdateMessage>;

export type CreateJiraIssueResponse = {};

export interface CreateJiraIssueInitMessage {
    site: DetailedSiteInfo;
    sitesAvailable: DetailedSiteInfo[];
    project: Project;
    screenData: CreateMetaTransformerResult<DetailedSiteInfo>;
}

export interface CreateIssueResponseMessage {
    createdIssue: IssueKeyAndSite<DetailedSiteInfo>;
}

export interface CreateJiraIssueUpdateMessage {
    field: FieldUI;
    options: string[];
}

export const emptyCreateJiraIssueInitMessage: CreateJiraIssueInitMessage = {
    site: emptySiteInfo,
    sitesAvailable: [],
    project: emptyProject,
    screenData: {
        issueTypes: [],
        selectedIssueType: emptyIssueType,
        issueTypeUIs: {},
        problems: {},
    },
};

export const emptyCreateJiraIssueUpdateMessage: CreateJiraIssueUpdateMessage = {
    field: {} as FieldUI,
    options: [],
};
