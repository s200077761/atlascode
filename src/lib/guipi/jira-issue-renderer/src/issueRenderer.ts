import { IssueType } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, InputFieldUI, OptionableFieldUI, SelectFieldUI } from '@atlassianlabs/jira-pi-meta-models';

export type CheckboxValue = {
    [id: string]: boolean;
};

export interface IssueRenderer<C> {
    renderTextInput: (field: InputFieldUI, onChange: (field: FieldUI, value: string) => void, value?: string) => C;
    renderTextAreaInput: (field: InputFieldUI, onChange: (field: FieldUI, value: string) => void, value?: string) => C;
    renderIssueTypeSelector: (
        field: SelectFieldUI,
        options: IssueType[],
        onSelect: (field: FieldUI, value: string) => void,
        value?: IssueType
    ) => C;
    renderSelectInput: (
        field: SelectFieldUI,
        options: any[],
        onSelect: (field: FieldUI, value: string) => void,
        value?: any
    ) => C;
    renderAutoCompleteInput: (
        field: SelectFieldUI,
        options: any[],
        onAutoComplete: (field: FieldUI, value: string) => void,
        onSelect: (field: FieldUI, value: string) => void,
        isWaiting: boolean,
        isCreatable: boolean,
        value?: any
    ) => C;
    renderCheckbox: (
        field: OptionableFieldUI,
        onChange: (field: FieldUI, value: CheckboxValue) => void,
        value?: CheckboxValue
    ) => C;
    renderRadioSelect: (
        field: OptionableFieldUI,
        onChange: (field: FieldUI, value: string) => void,
        value?: string
    ) => C;
    renderDateField: (field: FieldUI, onChange: (field: FieldUI, value?: Date) => void, value?: Date) => C;
    renderDateTimeField: (field: FieldUI, onChange: (field: FieldUI, value?: Date) => void, value?: Date) => C;
    renderIssueLinks: (
        field: FieldUI,
        linkTypes: any[],
        options: any[],
        onAutoComplete: (field: FieldUI, value: string) => void,
        onSelect: (field: FieldUI, value: string) => void,
        isWaiting: boolean
    ) => C;
}
