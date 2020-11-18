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
import { IssueRenderer } from './issueRenderer';

export class CreateIssueUIHelper<S extends JiraSiteInfo, C> {
    private _meta: CreateMetaTransformerResult<S>;
    private _renderer: IssueRenderer<C>;

    constructor(meta: CreateMetaTransformerResult<S>, renderer: IssueRenderer<C>) {
        this._meta = meta;
        this._renderer = renderer;
    }

    public getSortedFieldUIs(): [FieldUI[], FieldUI[]] {
        if (!this._meta.issueTypeUIs[this._meta.selectedIssueType.id]) {
            return [[], []];
        }
        const orderedValues: FieldUI[] = this.sortFieldValues(
            this._meta.issueTypeUIs[this._meta.selectedIssueType.id].fields
        );
        const advancedFields: FieldUI[] = [];
        const commonFields: FieldUI[] = [];

        orderedValues.forEach((field) => {
            if (field.advanced) {
                advancedFields.push(field);
            } else {
                commonFields.push(field);
            }
        });

        return [commonFields, advancedFields];
    }

    public getCommonFieldMarkup(): (C | undefined)[] {
        const [common] = this.getSortedFieldUIs();

        console.log(common.length);
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
                    return this._renderer.renderTextInput(
                        inputField,
                        this._meta.issueTypeUIs[this._meta.selectedIssueType.id].fieldValues[fieldUI.key]
                    );
                } else {
                    return this._renderer.renderTextAreaInput(
                        inputField,
                        this._meta.issueTypeUIs[this._meta.selectedIssueType.id].fieldValues[fieldUI.key]
                    );
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
                }
                return this._renderer.renderSelectInput(
                    selectField,
                    this._meta.issueTypeUIs[this._meta.selectedIssueType.id].selectFieldOptions[fieldUI.key],
                    this._meta.issueTypeUIs[this._meta.selectedIssueType.id].fieldValues[fieldUI.key]
                );
            }
        }

        return undefined;
    }
}
