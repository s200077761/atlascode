import { IssueType } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, InputFieldUI, OptionableFieldUI, SelectFieldUI } from '@atlassianlabs/jira-pi-meta-models';
import { CheckboxValue, IssueRenderer } from '.';

export const emptyIssueRenderer: IssueRenderer<any> = {
    renderTextInput: (field: InputFieldUI, onChange: (field: FieldUI, value: string) => void, value?: string) => {},
    renderTextAreaInput: (field: InputFieldUI, onChange: (field: FieldUI, value: string) => void, value?: string) => {},
    renderIssueTypeSelector: (
        field: SelectFieldUI,
        options: IssueType[],
        onSelect: (field: FieldUI, value: string) => void,
        value?: IssueType
    ) => {},
    renderSelectInput: (
        field: SelectFieldUI,
        options: any[],
        onSelect: (field: FieldUI, value: string) => void,
        value?: any
    ) => {},
    renderAutoCompleteInput: (
        field: SelectFieldUI,
        options: any[],
        onAutoComplete: (field: FieldUI, value: string) => void,
        onSelect: (field: FieldUI, value: string) => void,
        isCreatable?: boolean,
        value?: any
    ) => {},
    renderCheckbox: (
        field: OptionableFieldUI,
        onChange: (field: FieldUI, value: CheckboxValue) => void,
        value?: CheckboxValue
    ) => {},
};
