import { ScreenField } from "./commonIssueMeta";
import { IssueType } from "./jiraCommon";

export interface TransformerProblems { [k: string]: IssueTypeProblem; }
export interface TransformerResult {
    selectedIssueType: IssueType;
    screens: IssueTypeIdScreens;
    problems: TransformerProblems;
}

export interface SimpleIssueType {
    description: string;
    iconUrl: string;
    id: string;
    name: string;
    subtask: boolean;
}
export interface IssueTypeProblem {
    issueType: SimpleIssueType;
    isRenderable: boolean;
    nonRenderableFields: FieldProblem[];
    message: string;
}

export interface IssueTypeScreen {
    name: string;
    id: string;
    iconUrl: string;
    fields: ScreenField[];
}

export type IssueTypeIdScreens = { [k: string]: IssueTypeScreen };
