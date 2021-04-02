import { JiraSiteInfo } from '@atlassianlabs/jira-pi-common-models';
import {
    CreateMetaTransformerResult,
    FieldUI,
    FieldUIs,
    InputFieldUI,
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
        // Returning all fields for testing purposes?
        let [common, advanced] = this.getSortedFieldUIs();

        common = common.concat(advanced);

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
    // public async submitCreateIssue(): Promise<CreatedIssue> {
    //     const createdIssue = await this._client.createIssue({
    //         fields: this._meta.issueTypeUIs[this._meta.selectedIssueType.id].fieldValues,
    //     });
    //     return createdIssue;
    // }

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
                    return this._renderer.renderTextInput(inputField, this._delegate.valueForField(fieldUI));
                } else {
                    return this._renderer.renderTextAreaInput(inputField, this._delegate.valueForField(fieldUI));
                }
            }
            case UIType.Select: {
                const selectField = fieldUI as SelectFieldUI;
                if (selectField.valueType === ValueType.IssueType) {
                    return this._renderer.renderIssueTypeSelector(
                        selectField,
                        this._meta.issueTypeUIs[this._meta.selectedIssueType.id].selectFieldOptions[fieldUI.key],
                        this._meta.issueTypeUIs[this._meta.selectedIssueType.id].fieldValues[fieldUI.key]
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
                        (field: FieldUI, value: string) => {
                            this._delegate.fieldDidUpdate(field, value);
                        },
                        this._delegate.isFieldWaiting(selectField),
                        selectField.isCreateable,
                        this._delegate.valueForField(selectField)
                    );
                }
                return this._renderer.renderSelectInput(
                    selectField,
                    this._meta.issueTypeUIs[this._meta.selectedIssueType.id].selectFieldOptions[fieldUI.key],
                    this._delegate.valueForField(selectField)
                );
            }
        }

        return undefined;
    }
}
