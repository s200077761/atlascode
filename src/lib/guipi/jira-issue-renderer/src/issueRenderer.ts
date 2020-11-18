import { IssueType } from '@atlassianlabs/jira-pi-common-models';
import { InputFieldUI, SelectFieldUI } from '@atlassianlabs/jira-pi-meta-models';

export interface IssueRenderer<C> {
    renderTextInput: (field: InputFieldUI, value?: string) => C;
    renderTextAreaInput: (field: InputFieldUI, value?: string) => C;
    renderIssueTypeSelector: (field: SelectFieldUI, options: IssueType[], value?: IssueType) => C;
    renderSelectInput: (field: SelectFieldUI, options: any[], value?: any) => C;
}
