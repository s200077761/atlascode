import { FieldTransformerResult } from "jira-metaui-transformer";
import { DetailedSiteInfo, emptySiteInfo } from "../../../atlclients/authInfo";
import { EpicFieldInfo } from "../../jiraCommon";
import { emptyEpicFieldInfo } from "./emptyEntities";
import { MinimalIssue } from "./entities";

export interface EditIssueUI extends FieldTransformerResult {
    key: string;
    id: string;
    self: string;
    siteDetails: DetailedSiteInfo;
    epicFieldInfo: EpicFieldInfo;
    isEpic: boolean;
    epicChildren: MinimalIssue[];
    apiVersion: number;
}

export const emptyEditIssueUI: EditIssueUI = {
    key: "",
    id: "",
    self: "",
    siteDetails: emptySiteInfo,
    epicFieldInfo: emptyEpicFieldInfo,
    fields: {},
    fieldValues: {},
    selectFieldOptions: {},
    nonRenderableFields: [],
    hasRequiredNonRenderables: false,
    isEpic: false,
    epicChildren: [],
    apiVersion: 2,
};