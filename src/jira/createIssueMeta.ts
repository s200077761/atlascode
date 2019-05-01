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
}

export interface IssueTypeScreen {
    name: string;
    id: string;
    iconUrl: string;
    fields: ScreenField[];
}

export type IssueTypeIdScreens = { [k: string]: IssueTypeScreen };