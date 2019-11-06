import { FieldTransformerResult } from "jira-metaui-transformer";
import { emptyEpicFieldInfo, MinimalIssue } from "jira-pi-client";
import { DetailedSiteInfo, emptySiteInfo } from "../../../atlclients/authInfo";
import { EpicFieldInfo } from "../../jiraCommon";

export interface EditIssueUI extends FieldTransformerResult {
    key: string;
    id: string;
    self: string;
    siteDetails: DetailedSiteInfo;
    epicFieldInfo: EpicFieldInfo;
    isEpic: boolean;
    epicChildren: MinimalIssue<DetailedSiteInfo>[];
    apiVersion: string;
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
    apiVersion: "2",
};