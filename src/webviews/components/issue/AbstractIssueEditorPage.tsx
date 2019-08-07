import * as React from 'react';
import { Action, HostErrorMessage, Message } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreatedSomething, LabelList, UserList, IssueEditError, isIssueEditError } from "../../../ipc/issueMessaging";
import { FieldUI, UIType, ValueType, FieldValues, InputFieldUI, FieldUIs } from "../../../jira/jira-client/model/fieldUI";
import { FieldValidators } from "../fieldValidators";
import { Field, ErrorMessage } from '@atlaskit/form';
import { MinimalIssueOrKey } from '../../../jira/jira-client/model/entities';
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import EdiText, { EdiTextType } from 'react-editext';

type Func = (...args: any[]) => any;
type FuncOrUndefined = Func | undefined;

export type CommonEditorPageEmit = Action | OpenJiraIssueAction;
export type CommonEditorPageAccept = CreatedSomething | LabelList | UserList | HostErrorMessage | IssueEditError;

export interface CommonEditorViewState extends Message {
    fieldValues: FieldValues;
    isSomethingLoading: boolean;
    loadingField: string;
    isOnline: boolean;
    isErrorBannerOpen: boolean;
    errorDetails: any;
}

export const emptyCommonEditorState: CommonEditorViewState = {
    type: '',
    fieldValues: {},
    isSomethingLoading: false,
    loadingField: '',
    isOnline: true,
    isErrorBannerOpen: false,
    errorDetails: undefined,
};

export abstract class AbstractIssueEditorPage<EA extends CommonEditorPageEmit, ER, EP, ES extends CommonEditorViewState> extends WebviewComponent<EA, ER, EP, ES> {

    onMessageReceived(e: any): boolean {
        let handled: boolean = false;
        switch (e.type) {
            case 'error': {
                if (isIssueEditError(e)) {
                    this.setState({ isSomethingLoading: false, isErrorBannerOpen: true, errorDetails: e.reason, fieldValues: { ...this.state.fieldValues, ...e.fieldValues } });
                } else {
                    this.setState({ isSomethingLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });
                }
                handled = true;
                break;
            }
        }

        return handled;
    }

    postMessage<T extends CommonEditorPageEmit>(e: T) {
        this._api.postMessage(e);
    }

    protected sortFieldValues(fields: FieldUIs): FieldUI[] {
        return Object.values(fields).sort((left: FieldUI, right: FieldUI) => {
            if (left.displayOrder < right.displayOrder) { return -1; }
            if (left.displayOrder > right.displayOrder) { return 1; }
            return 0;
        });
    }

    protected handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    }

    protected handleOpenIssue = (issueOrKey: MinimalIssueOrKey) => {
        this.postMessage({
            action: "openJiraIssue",
            issueOrKey: issueOrKey,
        });
    }

    protected handleInlineEditTextfield = (field: FieldUI, newValue: string) => {

    }

    // refreshSelectFields(issueTypeId: string | undefined, issueData: CreateIssueData): Object {
    //     let fieldOptions = {};
    //     if (issueTypeId) {
    //         let selectFields = issueData.issueTypeScreens[issueTypeId].fields.filter(field => { return field.uiType === UIType.Select || field.uiType === UIType.IssueLink; });

    //         selectFields.forEach(field => {
    //             fieldOptions[field.key] = this.getSelectOptions(issueTypeId, field.key, issueData);
    //         });
    //     }
    //     return fieldOptions;
    // }

    // getSelectOptions(issueTypeId: string | undefined, fieldKey: string, issueData: CreateIssueData): any[] {
    //     let opts: any[] = new Array();

    //     if (issueTypeId) {
    //         const field: SelectFieldUI | undefined = issueData.issueTypeScreens[issueTypeId].fields.find(field => field.key === fieldKey) as SelectFieldUI | undefined;
    //         if (field && field.allowedValues && field.allowedValues.length > 0) {
    //             switch (fieldKey) {
    //                 case 'fixVersions':
    //                 case 'versions': {
    //                     let unreleasedOpts = field.allowedValues.filter(opt => { return !opt.released && !opt.archived; });
    //                     let releasedOpts = field.allowedValues.filter(opt => { return opt.released && !opt.archived; });

    //                     opts = [
    //                         { label: 'Unreleased Versions', options: unreleasedOpts }
    //                         , { label: 'Released Versions', options: releasedOpts }
    //                     ];
    //                     break;
    //                 }
    //                 case 'issuelinks': {
    //                     field.allowedValues.forEach(opt => {
    //                         opts.push({ ...opt, name: opt.inward, type: 'inward' });
    //                         opts.push({ ...opt, name: opt.outward, type: 'outward' });
    //                     });
    //                     break;
    //                 }

    //                 default: {
    //                     field.allowedValues.forEach(opt => { opts.push(opt); });
    //                     break;
    //                 }
    //             }
    //         }
    //     }

    //     return opts;
    // }

    protected getFieldMarkup(field: FieldUI, inline: boolean = false): any {
        switch (field.uiType) {
            case UIType.Input: {
                let validateFunc = this.getValidateFunction(field, inline);
                let validationFailMessage = "";
                let valType = field.valueType;
                switch (valType) {
                    case ValueType.Number: {
                        validationFailMessage = `${field.name} must be a number`;
                        break;
                    }
                    case ValueType.Url: {
                        validationFailMessage = `${field.name} must be a URL`;
                        break;
                    }
                    default: {
                        if (field.required) {
                            validationFailMessage = `${field.name} is required`;
                            break;
                        }
                        break;
                    }
                }

                if (inline) {
                    return (
                        <EdiText
                            type={this.inlineEditTypeForValueType(field.valueType)}
                            value={this.state.fieldValues[field.key]}
                            onSave={(val: string) => { this.handleInlineEditTextfield(field, val); }}
                            validation={validateFunc}
                            validationMessage={validationFailMessage}
                            inputProps={{ className: 'ac-inputField' }}
                            viewProps={{ className: 'ac-inline-input-view-p' }}
                            editButtonClassName='ac-inline-edit-button'
                            cancelButtonClassName='ac-inline-cancel-button'
                            saveButtonClassName='ac-inline-save-button'
                            editOnViewClick={true}
                        />
                    );
                }

                return (
                    <Field defaultValue={this.state.fieldValues[field.key]} label={field.name} isRequired={field.required} id={field.key} name={field.key} validate={validateFunc}>
                        {
                            (fieldArgs: any) => {
                                let errDiv = <span />;
                                if (fieldArgs.error !== undefined) {
                                    errDiv = <ErrorMessage>{validationFailMessage}</ErrorMessage>;
                                }

                                let markup = <input  {...fieldArgs.fieldProps} style={{ width: '100%', display: 'block' }} className='ac-inputField' disabled={this.state.isSomethingLoading} />;
                                if ((field as InputFieldUI).isMultiline) {
                                    markup = <textarea {...fieldArgs.fieldProps} style={{ width: '100%', display: 'block' }} className='ac-textarea' rows={5} disabled={this.state.isSomethingLoading} />;
                                }
                                return (
                                    <div>
                                        {markup}
                                        {errDiv}
                                    </div>
                                );
                            }
                        }
                    </Field>
                );
            }
        }

        // catch-all for unknown field types
        let validateFunc = field.required ? FieldValidators.validateString : undefined;
        return (
            <Field label={field.name} isRequired={field.required} id={field.key} name={field.key} validate={validateFunc}>
                {
                    (fieldArgs: any) => {
                        let errDiv = <span />;
                        if (fieldArgs.error === 'EMPTY') {
                            errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                        }
                        return (
                            <div>
                                <input {...fieldArgs.fieldProps} style={{ width: '100%', display: 'block' }} className='ac-inputField' />
                                {errDiv}
                            </div>
                        );
                    }
                }
            </Field>
        );
    }

    private getValidateFunction(field: FieldUI, inline: boolean = false): FuncOrUndefined {
        let valType = field.valueType;
        let valfunc = undefined;

        switch (valType) {
            case ValueType.Number: {
                if (inline) {
                    valfunc = (field.required) ? FieldValidators.validateRequiredNumber : FieldValidators.validateNumber;
                } else {
                    valfunc = (field.required) ? FieldValidators.isValidRequiredNumber : FieldValidators.isValidNumber;
                }
                break;
            }
            case ValueType.Url: {
                if (inline) {
                    valfunc = (field.required) ? FieldValidators.isValidRequiredUrl : FieldValidators.isValidUrl;
                } else {
                    valfunc = (field.required) ? FieldValidators.validateRequiredUrl : FieldValidators.validateUrl;
                }
                break;
            }

            default: {
                if (field.required) {
                    valfunc = (inline) ? FieldValidators.isValidString : FieldValidators.validateString;
                    break;
                }
            }
        }

        return valfunc;
    }

    private inlineEditTypeForValueType(vt: ValueType): EdiTextType {
        switch (vt) {
            case ValueType.Url:
                return "url";
            case ValueType.Number:
                return "number";
            default:
                return "text";
        }
    }

}
