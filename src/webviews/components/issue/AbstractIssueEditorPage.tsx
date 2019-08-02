import * as React from 'react';
import { Action, HostErrorMessage, Message } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreatedSomething, LabelList, UserList } from "../../../ipc/issueMessaging";
import { FieldUI, UIType, ValueType, FieldValues, InputFieldUI, FieldUIs } from "../../../jira/jira-client/model/fieldUI";
import { FieldValidators } from "../fieldValidators";
import { Field, ErrorMessage } from '@atlaskit/form';

export type CommonEditorPageEmit = Action;
export type CommonEditorPageAccept = CreatedSomething | LabelList | UserList | HostErrorMessage;

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

export abstract class AbstractIssueEditorPage<A extends Action, R, P, S extends CommonEditorViewState> extends WebviewComponent<A, R, P, S> {

    onMessageReceived(e: any): boolean {
        return false;
    }

    protected handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    }

    protected sortFieldValues(fields: FieldUIs): FieldUI[] {
        return Object.values(fields).sort((left: FieldUI, right: FieldUI) => {
            if (left.displayOrder < right.displayOrder) { return -1; }
            if (left.displayOrder > right.displayOrder) { return 1; }
            return 0;
        });
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

    protected getFieldMarkup(field: FieldUI): any {
        switch (field.uiType) {
            case UIType.Input: {
                let validateFunc = undefined;
                let valType = field.valueType;
                switch (valType) {
                    case ValueType.Number: {
                        validateFunc = (value: any, state: any) => {
                            if (field.required) {
                                return FieldValidators.validateRequiredNumber(value, state);
                            }

                            return FieldValidators.validateNumber(value, state);
                        };

                        break;
                    }
                    case ValueType.Url: {
                        validateFunc = (field.required) ? FieldValidators.validateRequiredUrl : FieldValidators.validateUrl;
                        break;
                    }
                    default: {
                        if (field.required) {
                            validateFunc = FieldValidators.validateString;
                            break;
                        }
                        break;
                    }
                }

                return (
                    <Field defaultValue={this.state.fieldValues[field.key]} label={field.name} isRequired={field.required} id={field.key} name={field.key} validate={validateFunc}>
                        {
                            (fieldArgs: any) => {
                                let errDiv = <span />;
                                if (fieldArgs.error === 'EMPTY') {
                                    errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                } else if (fieldArgs.error === 'NOT_NUMBER') {
                                    errDiv = <ErrorMessage>{field.name} must be a number</ErrorMessage>;
                                } else if (fieldArgs.error === 'NOT_URL') {
                                    errDiv = <ErrorMessage>{field.name} must be a url</ErrorMessage>;
                                }

                                let markup = <input {...fieldArgs.fieldProps} style={{ width: '100%', display: 'block' }} className='ac-inputField' disabled={this.state.isSomethingLoading} />;
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
}