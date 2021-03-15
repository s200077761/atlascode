import { IssueType } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, InputFieldUI, SelectFieldUI } from '@atlassianlabs/jira-pi-meta-models';
import { IssueRenderer } from '.';

export const emptyIssueRenderer: IssueRenderer<any> = {
    renderTextInput: (field: InputFieldUI, value?: string) => {},
    renderTextAreaInput: (field: InputFieldUI, value?: string) => {},
    renderIssueTypeSelector: (field: SelectFieldUI, options: IssueType[], value?: IssueType) => {},
    renderSelectInput: (field: SelectFieldUI, options: any[], value?: any) => {},
    renderAutoCompleteInput: (
        field: SelectFieldUI,
        options: any[],
        onAutoComplete: (field: FieldUI, value: string) => void,
        onSelect: (field: FieldUI, value: string) => void,
        isCreatable?: boolean,
        value?: any
    ) => {},
};
