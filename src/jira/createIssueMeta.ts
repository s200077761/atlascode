export enum UIType {
    Select = 'select',
    Checkbox = 'checkbox',
    Radio = 'radio',
    Textarea = 'textarea',
    Input = 'input',
    Date = 'date',
    DateTime = 'datetime',
    User = 'user',
    IssueLink = 'issuelink'
}

export enum InputValueType {
    String = 'string',
    Number = 'number',
    Url = 'url'
}

export interface TransformerProblems { [k: string]: IssueTypeProblem; }
export interface TransformerResult {
    selectedIssueType: JIRA.Schema.CreateMetaIssueTypeBean;
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

export interface FieldProblem {
    field: JIRA.Schema.FieldMetaBean;
    message: string;
    schema: string;
}

export interface ScreenField {
    required: boolean;
    name: string;
    key: string;
    uiType: UIType;
    advanced: boolean;
}

export interface InputScreenField extends ScreenField {
    valueType: InputValueType;
}

export interface OptionableScreenField extends ScreenField {
    allowedValues: any[];
}

export interface UserScreenField extends ScreenField {
    isMulti: boolean;
}

export interface SelectScreenField extends OptionableScreenField {
    isMulti: boolean;
    isCascading: boolean;
    isCreateable: boolean;
    autoCompleteUrl: string;
    autoCompleteJql: string;
}

export interface IssueTypeScreen {
    name: string;
    id: string;
    iconUrl: string;
    fields: ScreenField[];
}

export type IssueTypeIdScreens = { [k: string]: IssueTypeScreen };