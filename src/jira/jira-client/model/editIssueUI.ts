import { DetailedSiteInfo, emptySiteInfo } from "../../../atlclients/authInfo";
import { MinimalIssue } from "./entities";
import { FieldTransformerResult } from "./fieldUI";
import { EpicFieldInfo } from "../../jiraCommon";
import { emptyEpicFieldInfo } from "./emptyEntities";

export interface EditIssueUI extends FieldTransformerResult {
    key: string;
    id: string;
    self: string;
    siteDetails: DetailedSiteInfo;
    isEpic: boolean;
    epicChildren: MinimalIssue[];
    epicFieldInfo: EpicFieldInfo;
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
};