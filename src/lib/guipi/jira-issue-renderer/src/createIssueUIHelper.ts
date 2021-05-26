import { JiraSiteInfo } from '@atlassianlabs/jira-pi-common-models';
import {
    CreateMetaTransformerResult,
    FieldUI,
    FieldUIs,
    InputFieldUI,
    OptionableFieldUI,
    SelectFieldUI,
    UIType,
    ValueType,
} from '@atlassianlabs/jira-pi-meta-models';
import { IssueDelegate } from './issueDelegate';
import { IssueRenderer } from './issueRenderer';

export class CreateIssueUIHelper<S extends JiraSiteInfo, C> {
    constructor(
        private _meta: CreateMetaTransformerResult<S>,
        private _renderer: IssueRenderer<C>,
        private _delegate: IssueDelegate
    ) {}

    private getSortedFieldUIs(): [FieldUI[], FieldUI[]] {
        if (!this._meta.issueTypeUIs[this._meta.selectedIssueType.id]) {
            return [[], []];
        }
        const orderedValues: FieldUI[] = this.sortFieldValues(
            this._meta.issueTypeUIs[this._meta.selectedIssueType.id].fields
        );
        const advancedFields: FieldUI[] = [];
        const commonFields: FieldUI[] = [];

        orderedValues.forEach((field) => {
            if (!this._delegate.isFieldDisabled(field)) {
                if (field.advanced) {
                    advancedFields.push(field);
                } else {
                    commonFields.push(field);
                }
            }
        });

        return [commonFields, advancedFields];
    }

    public getCommonFieldMarkup(): (C | undefined)[] {
        let [common] = this.getSortedFieldUIs();

        return common.map((fieldUI) => {
            return this.renderFieldUI(fieldUI);
        });
    }

    public getAdvancedFieldMarkup(): (C | undefined)[] {
        const [, advanced] = this.getSortedFieldUIs();

        return advanced.map((fieldUI) => {
            return this.renderFieldUI(fieldUI);
        });
    }

    protected sortFieldValues(fields: FieldUIs): FieldUI[] {
        return Object.values(fields).sort((left: FieldUI, right: FieldUI) => {
            if (left.displayOrder < right.displayOrder) {
                return -1;
            }
            if (left.displayOrder > right.displayOrder) {
                return 1;
            }
            return 0;
        });
    }

    private renderFieldUI(fieldUI: FieldUI): C | undefined {
        switch (fieldUI.uiType) {
            case UIType.Input: {
                const inputField = fieldUI as InputFieldUI;
                if (!inputField.isMultiline) {
                    return this._renderer.renderTextInput(
                        inputField,
                        this._delegate.fieldDidUpdate,
                        this._delegate.valueForField(fieldUI)
                    );
                } else {
                    return this._renderer.renderTextAreaInput(
                        inputField,
                        this._delegate.fieldDidUpdate,
                        this._delegate.valueForField(fieldUI)
                    );
                }
            }
            case UIType.Select: {
                const selectField = fieldUI as SelectFieldUI;
                if (selectField.valueType === ValueType.IssueType) {
                    return this._renderer.renderIssueTypeSelector(
                        selectField,
                        this._meta.issueTypeUIs[this._meta.selectedIssueType.id].selectFieldOptions[fieldUI.key],
                        this._delegate.fieldDidUpdate,
                        this._delegate.valueForField(selectField)
                    );
                } else if (selectField.autoCompleteUrl) {
                    let options =
                        this._delegate.optionsForField(selectField) ??
                        this._meta.issueTypeUIs[this._meta.selectedIssueType.id].selectFieldOptions[fieldUI.key];
                    return this._renderer.renderAutoCompleteInput(
                        selectField,
                        options,
                        (field: FieldUI, value: string) => {
                            this._delegate.autocompleteRequest(field as SelectFieldUI, value);
                        },
                        this._delegate.fieldDidUpdate,
                        this._delegate.isFieldWaiting(selectField),
                        selectField.isCreateable,
                        this._delegate.valueForField(selectField)
                    );
                }
                return this._renderer.renderSelectInput(
                    selectField,
                    this._delegate.optionsForField(selectField) ?? [],
                    this._delegate.fieldDidUpdate,
                    this._delegate.valueForField(selectField)
                );
            }
            case UIType.Checkbox: {
                const checkboxField = fieldUI as OptionableFieldUI;
                return this._renderer.renderCheckbox(
                    checkboxField,
                    this._delegate.fieldDidUpdate,
                    this._delegate.valueForField(fieldUI)
                );
            }
            case UIType.Radio: {
                const radioField = fieldUI as OptionableFieldUI;
                return this._renderer.renderRadioSelect(
                    radioField,
                    this._delegate.fieldDidUpdate,
                    this._delegate.valueForField(fieldUI)
                );
            }
            case UIType.Date: {
                return this._renderer.renderDateField(
                    fieldUI,
                    this._delegate.fieldDidUpdate,
                    this._delegate.valueForField(fieldUI)
                );
            }
            case UIType.DateTime: {
                return this._renderer.renderDateTimeField(
                    fieldUI,
                    this._delegate.fieldDidUpdate,
                    this._delegate.valueForField(fieldUI)
                );
            }
            case UIType.IssueLinks: {
                const issueFieldUI: SelectFieldUI = fieldUI as SelectFieldUI;
                return this._renderer.renderIssueLinks(
                    fieldUI,
                    this._meta.issueTypeUIs[this._meta.selectedIssueType.id].selectFieldOptions[fieldUI.key],
                    this._delegate.optionsForField(fieldUI) ?? [],
                    (field: FieldUI, value: string) => {
                        this._delegate.autocompleteRequest(issueFieldUI, value);
                    },
                    this._delegate.fieldDidUpdate,
                    this._delegate.isFieldWaiting(issueFieldUI)
                );
            }
        }

        return undefined;
    }
}
