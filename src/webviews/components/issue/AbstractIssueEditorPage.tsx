import * as React from 'react';
import { Action, HostErrorMessage, Message } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreatedSelectOption, LabelList, UserList, IssueEditError, isIssueEditError, IssueSuggestionsList, isCreatedSelectOption } from "../../../ipc/issueMessaging";
import { FieldUI, UIType, ValueType, FieldValues, InputFieldUI, FieldUIs, SelectFieldUI } from "../../../jira/jira-client/model/fieldUI";
import { FieldValidators, chain } from "../fieldValidators";
import { Field, ErrorMessage } from '@atlaskit/form';
import { MinimalIssueOrKeyAndSiteOrKey } from '../../../jira/jira-client/model/entities';
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import EdiText, { EdiTextType } from 'react-editext';
import Spinner from '@atlaskit/spinner';
import { ButtonGroup } from '@atlaskit/button';
import { Button } from '@atlaskit/button/components/Button';
import InlineSubtaskEditor from './InlineSubtaskEditor';
import InlineIssueLinksEditor from './InlineIssueLinkEditor';
import { IssuePickerIssue } from '../../../jira/jira-client/model/responses';
import { emptySiteInfo, DetailedSiteInfo } from '../../../atlclients/authInfo';
import { SelectFieldHelper } from '../selectFieldHelper';
// import Select, { AsyncCreatableSelect, AsyncSelect, CreatableSelect, components } from '@atlaskit/select';
import Select, { CreatableSelect } from '@atlaskit/select';

type Func = (...args: any[]) => any;
type FuncOrUndefined = Func | undefined;


export type CommonEditorPageEmit = Action | OpenJiraIssueAction;
export type CommonEditorPageAccept = CreatedSelectOption | LabelList | UserList | HostErrorMessage | IssueEditError;

export interface CommonEditorViewState extends Message {
    siteDetails: DetailedSiteInfo;
    fieldValues: FieldValues;
    selectFieldOptions: { [k: string]: any[] };
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
    siteDetails: emptySiteInfo,
    fieldValues: {},
    selectFieldOptions: {},
    isSomethingLoading: false,
    loadingField: '',
    editingField: '',
    isOnline: true,
    isErrorBannerOpen: false,
    errorDetails: undefined,
    commentInputValue: '',
};

const shouldShowCreateOption = (inputValue: any, selectValue: any, selectOptions: any[]) => {
    if (inputValue.trim().length === 0 || selectOptions.find(option => option.name === inputValue)) {
        return false;
    }
    return true;
};

export abstract class AbstractIssueEditorPage<EA extends CommonEditorPageEmit, ER, EP, ES extends CommonEditorViewState> extends WebviewComponent<EA, ER, EP, ES> {
    private issueSuggestions: IssuePickerIssue[] | undefined = undefined;
    private waitForCreateOptionResponse: boolean = false;

    abstract getProjectKey(): string;

    protected handleInlineEdit = (field: FieldUI, newValue: any) => { };
    protected handleCommentSave = (newValue: string) => { };
    protected handleSelectChange = (field: SelectFieldUI, newValue: any) => { };

    onMessageReceived(e: any): boolean {
        let handled: boolean = false;
        switch (e.type) {
            case 'error': {
                this.waitForCreateOptionResponse = false;
                if (isIssueEditError(e)) {
                    this.setState({ isSomethingLoading: false, loadingField: '', isErrorBannerOpen: true, errorDetails: e.reason, fieldValues: { ...this.state.fieldValues, ...e.fieldValues } });
                } else {
                    this.setState({ isSomethingLoading: false, loadingField: '', isErrorBannerOpen: true, errorDetails: e.reason });
                }
                handled = true;
                break;
            }
            case 'issueSuggestionsList': {
                handled = true;
                this.issueSuggestions = (e as IssueSuggestionsList).issues;
                break;
            }
            case 'optionCreated': {
                if (isCreatedSelectOption(e)) {
                    this.setState(
                        {
                            isSomethingLoading: false,
                            loadingField: '',
                            fieldValues: { ...this.state.fieldValues, ...e.fieldValues },
                            selectFieldOptions: { ...this.state.selectFieldOptions, ...e.selectFieldOptions },
                        });
                }
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
        let issueObj = issueOrKey;

        if (typeof issueOrKey === 'string') {
            issueObj = { key: issueOrKey, siteDetails: this.state.siteDetails };
        }

        this.postMessage({
            action: "openJiraIssue",
            issueOrKey: issueObj,
        });
    }

    protected loadIssueOptions = (field: SelectFieldUI, input: string): Promise<IssuePickerIssue[]> => {
        return new Promise(resolve => {
            this.issueSuggestions = undefined;
            this.postMessage({ action: 'fetchIssues', query: input, site: this.state.siteDetails, autocompleteUrl: field.autoCompleteUrl });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if (this.issueSuggestions !== undefined || (end - start) > 2000) {
                    if (this.issueSuggestions === undefined) {
                        this.issueSuggestions = [];
                    }

                    clearInterval(timer);
                    this.setState({ isSomethingLoading: false, loadingField: '' });
                    resolve(this.issueSuggestions);
                }
            }, 100);
        });
    }

    handleSelectOptionCreate = (field: SelectFieldUI, input: string): void => {
        if (field.createUrl.trim() !== '') {
            this.waitForCreateOptionResponse = true;
            this.setState({ isSomethingLoading: true, loadingField: field.key });
            this.postMessage({
                action: 'createOption',
                fieldKey: field.key,
                siteDetails: this.state.siteDetails,
                createUrl: field.createUrl,
                createData: { name: input, project: this.getProjectKey() }

            });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if (!this.waitForCreateOptionResponse || (end - start) > 2000) {
                    clearInterval(timer);
                }
            }, 100);
        }
    }

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
                        subtaskTypes={this.state.selectFieldOptions[field.key]}
                        onSave={(val: any) => { this.handleInlineEdit(field, val); }}
                        isLoading={this.state.loadingField === field.key}
                    />;
                } else {

                }
                return markup;
            }

            case UIType.IssueLinks: {
                let markup = <div></div>;
                if (editmode) {
                    markup = <InlineIssueLinksEditor
                        label={field.name}
                        linkTypes={this.state.selectFieldOptions[field.key]}
                        onSave={(val: any) => { this.handleInlineEdit(field, val); }}
                        isLoading={this.state.loadingField === field.key}
                        onFetchIssues={async (input: string) => this.loadIssueOptions(field as SelectFieldUI, input)}
                    />;
                } else {

                }
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
            case UIType.Select: {
                const selectField = field as SelectFieldUI;

                let validateFunc = undefined;
                if (field.required) {
                    validateFunc = (selectField.isMulti) ? FieldValidators.validateMultiSelect : FieldValidators.validateSingleSelect;
                }

                const commonProps = {
                    isMulti: selectField.isMulti,
                    isClearable: (!field.required && selectField.isMulti),
                    className: "ac-select-container",
                    classNamePrefix: "ac-select",
                    getOptionLabel: SelectFieldHelper.labelFuncForValueType(selectField.valueType),
                    getOptionValue: SelectFieldHelper.valueFuncForValueType(selectField.valueType),
                    components: SelectFieldHelper.getComponentsForValueType(selectField.valueType),
                };

                if (editmode) {
                    commonProps['label'] = field.name;
                    commonProps['id'] = field.key;
                    commonProps['name'] = field.key;
                    commonProps['defaultValue'] = this.state.fieldValues[field.key];
                }

                switch (SelectFieldHelper.selectComponentType(selectField)) {
                    case SelectFieldHelper.SelectComponentType.Select: {
                        if (editmode) {
                            return (
                                <Select
                                    {...commonProps}
                                    options={this.state.selectFieldOptions[field.key]}
                                    isDisabled={this.state.isSomethingLoading}
                                    onChange={(selected: any) => { this.handleSelectChange(selectField, selected); }}
                                />
                            );
                        }

                        // create mode
                        return (
                            <Field label={field.name}
                                isRequired={field.required}
                                id={field.key}
                                name={field.key}
                                validate={validateFunc}
                                defaultValue={this.state.fieldValues[field.key]}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                        }
                                        return (
                                            <React.Fragment>
                                                <Select
                                                    {...fieldArgs.fieldProps}
                                                    {...commonProps}
                                                    options={this.state.selectFieldOptions[field.key]}
                                                    isDisabled={this.state.isSomethingLoading}
                                                    onChange={chain(fieldArgs.fieldProps.onChange, (selected: any) => { this.handleSelectChange(selectField, selected); })}
                                                />
                                                {errDiv}
                                            </React.Fragment>
                                        );
                                    }
                                }
                            </Field>
                        );

                    }

                    case SelectFieldHelper.SelectComponentType.Creatable: {
                        if (editmode) {
                            return (
                                <CreatableSelect
                                    {...commonProps}
                                    options={this.state.selectFieldOptions[field.key]}
                                    isDisabled={this.state.isSomethingLoading}
                                    isLoading={this.state.loadingField === field.key}
                                    isValidNewOption={shouldShowCreateOption}
                                    onCreateOption={(input: any): void => { this.handleSelectOptionCreate(selectField, input); }}
                                    onChange={(selected: any) => { this.handleSelectChange(selectField, selected); }}
                                />
                            );
                        }

                        //create mode
                        return (
                            <Field label={field.name}
                                isRequired={field.required}
                                id={field.key}
                                name={field.key}
                                validate={validateFunc}
                                defaultValue={this.state.fieldValues[field.key]}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                        }
                                        return (
                                            <React.Fragment>
                                                <CreatableSelect
                                                    {...fieldArgs.fieldProps}
                                                    {...commonProps}
                                                    options={this.state.selectFieldOptions[field.key]}
                                                    isDisabled={this.state.isSomethingLoading}
                                                    isLoading={this.state.loadingField === field.key}
                                                    isValidNewOption={shouldShowCreateOption}
                                                    onCreateOption={(input: any): void => { this.handleSelectOptionCreate(selectField, input); }}
                                                    onChange={chain(fieldArgs.fieldProps.onChange, (selected: any) => { this.handleSelectChange(selectField, selected); })}
                                                />
                                                {errDiv}
                                            </React.Fragment>
                                        );
                                    }
                                }
                            </Field>
                        );
                    }

                    case SelectFieldHelper.SelectComponentType.Async: {
                        if (editmode) {
                            return (
                                <div>async select</div>
                                // <CreatableSelect
                                //     {...commonProps}
                                //     options={this.state.selectFieldOptions[field.key]}
                                //     isDisabled={this.state.isSomethingLoading}
                                //     isLoading={this.state.loadingField === field.key}
                                //     isValidNewOption={shouldShowCreateOption}
                                //     onCreateOption={(input: any): void => { this.handleSelectOptionCreate(selectField, input); }}
                                // />
                            );
                        }

                        //create mode
                        return (
                            <Field label={field.name}
                                isRequired={field.required}
                                id={field.key}
                                name={field.key}
                                validate={validateFunc}
                                defaultValue={this.state.fieldValues[field.key]}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                        }
                                        return (
                                            <React.Fragment>
                                                {errDiv}
                                            </React.Fragment>
                                        );
                                    }
                                }
                            </Field>
                        );
                    }

                    case SelectFieldHelper.SelectComponentType.AsyncCreatable: {
                        if (editmode) {
                            return (
                                <div>async creatable select</div>
                            );
                        }

                        //create mode
                        return (
                            <Field label={field.name}
                                isRequired={field.required}
                                id={field.key}
                                name={field.key}
                                validate={validateFunc}
                                defaultValue={this.state.fieldValues[field.key]}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                        }
                                        return (
                                            <React.Fragment>
                                                {errDiv}
                                            </React.Fragment>
                                        );
                                    }
                                }
                            </Field>
                        );
                    }
                }
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
