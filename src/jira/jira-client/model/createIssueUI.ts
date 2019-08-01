import { IssueType } from "./entities";
import { FieldProblem, FieldUI, FieldUIs } from "./fieldUI";

export interface CreateMetaTransformerProblems { [k: string]: IssueTypeProblem; }
export interface CreateMetaTransformerResult {
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

export interface IssueTypeUI {
    name: string;
    id: string;
    iconUrl: string;
    fields: FieldUIs;
}

export type IssueTypeUIs = { [k: string]: IssueTypeUI };
