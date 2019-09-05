import { DetailedSiteInfo, emptySiteInfo } from "../../../atlclients/authInfo";
import { MinimalIssue, IssueType } from "./entities";
import { FieldTransformerResult, FieldProblem } from "./fieldUI";
import { EpicFieldInfo } from "../../jiraCommon";
import { emptyEpicFieldInfo, emptyIssueType } from "./emptyEntities";

export interface EditIssueUI extends FieldTransformerResult {
    key: string;
    id: string;
    self: string;
    siteDetails: DetailedSiteInfo;
    isEpic: boolean;
    epicChildren: MinimalIssue[];
    epicFieldInfo: EpicFieldInfo;
    apiVersion: number;
}

export const emptyEditIssueUI: EditIssueUI = {
    key: "",
    id: "",
    self: "",
    siteDetails: emptySiteInfo,
    isEpic: false,
    epicChildren: [],
    epicFieldInfo: emptyEpicFieldInfo,
    fields: {},
    fieldValues: {},
    selectFieldOptions: {},
    nonRenderableFields: [],
    hasRequiredNonRenderables: false,
    apiVersion: 2,
};

export interface CreateMetaTransformerProblems { [k: string]: IssueTypeProblem; }
export interface CreateMetaTransformerResult {
    issueTypes: IssueType[];
    selectedIssueType: IssueType;
    issueTypeUIs: IssueTypeUIs;
    problems: CreateMetaTransformerProblems;
}

export interface IssueTypeProblem {
    issueType: IssueType;
    isRenderable: boolean;
    nonRenderableFields: FieldProblem[];
    message: string;
}

export interface IssueTypeUI extends FieldTransformerResult {
    siteDetails: DetailedSiteInfo;
    apiVersion: number;
    epicFieldInfo: EpicFieldInfo;
}

export const emptyIssueTypeUI: IssueTypeUI = {
    siteDetails: emptySiteInfo,
    epicFieldInfo: emptyEpicFieldInfo,
    apiVersion: 2,
    fields: {},
    fieldValues: {},
    selectFieldOptions: {},
    nonRenderableFields: [],
    hasRequiredNonRenderables: false,
};

export type IssueTypeUIs = { [k: string]: IssueTypeUI };

export const emptyCreateMetaResult: CreateMetaTransformerResult = {
    selectedIssueType: emptyIssueType,
    issueTypeUIs: {},
    problems: {},
    issueTypes: [],
};
