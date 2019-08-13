import * as React from 'react';
import { Action, HostErrorMessage, Message } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreatedSomething, LabelList, UserList, IssueEditError, isIssueEditError } from "../../../ipc/issueMessaging";
import { FieldUI, UIType, ValueType, FieldValues, InputFieldUI, FieldUIs, OptionableFieldUI } from "../../../jira/jira-client/model/fieldUI";
import { FieldValidators } from "../fieldValidators";
import { Field, ErrorMessage } from '@atlaskit/form';
import { MinimalIssueOrKeyAndSiteOrKey } from '../../../jira/jira-client/model/entities';
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import EdiText, { EdiTextType } from 'react-editext';
import Spinner from '@atlaskit/spinner';
import { ButtonGroup } from '@atlaskit/button';
import { Button } from '@atlaskit/button/components/Button';
import InlineSubtaskEditor from './InlineSubtaskEditor';

type Func = (...args: any[]) => any;
type FuncOrUndefined = Func | undefined;

export type CommonEditorPageEmit = Action | OpenJiraIssueAction;
export type CommonEditorPageAccept = CreatedSomething | LabelList | UserList | HostErrorMessage | IssueEditError;

export interface CommonEditorViewState extends Message {
    fieldValues: FieldValues;
    isSomethingLoading: boolean;
    loadingField: string;
    editingField: string;
    isOnline: boolean;
    isErrorBannerOpen: boolean;
    errorDetails: any;
    commentInputValue: string;
}

export const emptyCommonEditorState: CommonEditorViewState = {
    type: '',
    fieldValues: {},
    isSomethingLoading: false,
    loadingField: '',
    editingField: '',
    isOnline: true,
    isErrorBannerOpen: false,
    errorDetails: undefined,
    commentInputValue: '',
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

    private handleCommentInput = (e: any) => {
        const val: string = e.target.value.trim();
        this.setState({ commentInputValue: val });
    }

    private handleCommentSaveClick = (e: any) => {
        this.handleCommentSave(this.state.commentInputValue);
        this.setState({ commentInputValue: "" });
    }

    private handleCommentCancelClick = (e: any) => {
        this.setState({ commentInputValue: "" });
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

    protected handleOpenIssue = (issueOrKey: MinimalIssueOrKeyAndSiteOrKey) => {
        this.postMessage({
            action: "openJiraIssue",
            issueOrKey: issueOrKey,
        });
    }

    protected handleInlineEdit = (field: FieldUI, newValue: any) => {

    }



    protected handleCommentSave = (newValue: string) => {

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

    protected getInputMarkup(field: FieldUI, editmode: boolean = false): any {
        switch (field.uiType) {
            case UIType.Input: {
                let validateFunc = this.getValidateFunction(field, editmode);
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

                if (editmode) {
                    let markup: React.ReactNode = <p></p>;

                    if ((field as InputFieldUI).isMultiline) {
                        if (this.state.fieldValues[`${field.key}.rendered`] !== undefined) {
                            markup = <p id={field.key} dangerouslySetInnerHTML={{ __html: this.state.fieldValues[`${field.key}.rendered`] }} />;
                        } else {
                            markup = <p id={field.key} >{this.state.fieldValues[field.key]}</p>;
                        }
                    } else {
                        markup = <EdiText
                            type={this.inlineEditTypeForValueType(field.valueType)}
                            value='testing'
                            onSave={(val: string) => { this.handleInlineEdit(field, val); }}
                            validation={validateFunc}
                            validationMessage={validationFailMessage}
                            inputProps={{ className: 'ac-inputField' }}
                            viewProps={{ id: field.key, className: 'ac-inline-input-view-p' }}
                            editButtonClassName='ac-hidden'
                            cancelButtonClassName='ac-inline-cancel-button'
                            saveButtonClassName='ac-inline-save-button'
                            editOnViewClick={true}
                        />;
                    }
                    return markup;
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
            case UIType.Subtasks: {
                let markup = <div></div>;
                if (editmode) {
                    markup = <InlineSubtaskEditor
                        label={field.name}
                        subtaskTypes={(field as OptionableFieldUI).allowedValues}
                        onSave={(val: any) => { this.handleInlineEdit(field, val); }}
                        isLoading={this.state.loadingField === field.key}
                    />;
                } else {

                }
                return markup;
            }

            case UIType.IssueLinks: {
                let markup = <div></div>;

                return markup;
            }
            case UIType.Comments: {
                return (<div style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}>
                    {this.state.loadingField === field.key && <Spinner size='large' />}
                    <textarea
                        className='ac-textarea'
                        rows={5}
                        placeholder='Add a comment'
                        value={this.state.commentInputValue}
                        onChange={this.handleCommentInput}
                    />
                    <ButtonGroup>
                        <Button className='ac-button' onClick={this.handleCommentSaveClick} isDisabled={this.state.commentInputValue === ''}>Save</Button>
                        <Button appearance="default" onClick={this.handleCommentCancelClick}>Cancel</Button>
                    </ButtonGroup>
                </div>);
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

    private getValidateFunction(field: FieldUI, editmode: boolean = false): FuncOrUndefined {
        let valType = field.valueType;
        let valfunc = undefined;

        switch (valType) {
            case ValueType.Number: {
                if (editmode) {
                    valfunc = (field.required) ? FieldValidators.validateRequiredNumber : FieldValidators.validateNumber;
                } else {
                    valfunc = (field.required) ? FieldValidators.isValidRequiredNumber : FieldValidators.isValidNumber;
                }
                break;
            }
            case ValueType.Url: {
                if (editmode) {
                    valfunc = (field.required) ? FieldValidators.isValidRequiredUrl : FieldValidators.isValidUrl;
                } else {
                    valfunc = (field.required) ? FieldValidators.validateRequiredUrl : FieldValidators.validateUrl;
                }
                break;
            }

            default: {
                if (field.required) {
                    valfunc = (editmode) ? FieldValidators.isValidString : FieldValidators.validateString;
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
