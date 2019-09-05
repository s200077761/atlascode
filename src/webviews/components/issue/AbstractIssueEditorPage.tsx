import * as React from 'react';
import { Action, HostErrorMessage, Message } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreatedSelectOption, LabelList, UserList, IssueEditError, isIssueEditError, IssueSuggestionsList, isCreatedSelectOption } from "../../../ipc/issueMessaging";
import { FieldUI, UIType, ValueType, FieldValues, InputFieldUI, FieldUIs, SelectFieldUI, OptionableFieldUI } from "../../../jira/jira-client/model/fieldUI";
import { FieldValidators, chain } from "../fieldValidators";
import { Field, ErrorMessage, CheckboxField, Fieldset, HelperMessage } from '@atlaskit/form';
import { MinimalIssueOrKeyAndSiteOrKey } from '../../../jira/jira-client/model/entities';
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import EdiText, { EdiTextType } from 'react-editext';
import Spinner from '@atlaskit/spinner';
import { ButtonGroup } from '@atlaskit/button';
import Button from '@atlaskit/button';
import InlineSubtaskEditor from './InlineSubtaskEditor';
import InlineIssueLinksEditor from './InlineIssueLinkEditor';
import { IssuePickerIssue } from '../../../jira/jira-client/model/responses';
import { emptySiteInfo, DetailedSiteInfo } from '../../../atlclients/authInfo';
import { SelectFieldHelper } from '../selectFieldHelper';
import Select, { CreatableSelect, AsyncSelect, AsyncCreatableSelect } from '@atlaskit/select';
import { DatePicker, DateTimePicker } from '@atlaskit/datetime-picker';
import { ParticipantList } from './ParticipantList';
import { Checkbox } from '@atlaskit/checkbox';
import { RadioGroup } from '@atlaskit/radio';
import debounce from "lodash.debounce";

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

const Condition = ({ when, is, children }: any) => {
    return <Field name={when} subscription={{ value: false }}>
        {({ fieldProps }: { fieldProps: any }) => {
            return (fieldProps && fieldProps.value && fieldProps.value === is ? children : null);
        }}
    </Field>;
};

const shouldShowCreateOption = (inputValue: any, selectValue: any, selectOptions: any[]) => {
    if (inputValue.trim().length === 0 || selectOptions.find(option => option.name === inputValue)) {
        return false;
    }

    return true;
};

export abstract class AbstractIssueEditorPage<EA extends CommonEditorPageEmit, ER, EP, ES extends CommonEditorViewState> extends WebviewComponent<EA, ER, EP, ES> {
    private selectSuggestions: any[] | undefined = undefined;
    private waitForCreateOptionResponse: boolean = false;
    abstract getProjectKey(): string;

    protected handleInlineEdit = (field: FieldUI, newValue: any) => { };
    protected handleCommentSave = (newValue: string) => { };

    // react-select has issues and doesn't stop propagation on click events when you provide
    // a custom option component.  e.g. it calls this twice, so we have to debounce.
    // see: https://github.com/JedWatson/react-select/issues/2477
    // and more importantly: https://github.com/JedWatson/react-select/issues/2326
    protected handleSelectChange = debounce((field: FieldUI, newValue: any) => {
        console.log(`${field.name} was changed`, newValue);
        this.handleInlineEdit(field, this.formatEditValue(field, newValue));
    }, 100);

    protected formatEditValue(field: FieldUI, newValue: any): any {
        let val = newValue;
        if ((field.valueType === ValueType.String || field.valueType === ValueType.Number)
            && (typeof newValue !== 'string' && typeof newValue !== 'number')) {
            if (Array.isArray(newValue)) {
                val = newValue.map(aryValue => {
                    if (typeof aryValue === 'object') {
                        return aryValue.value;
                    }
                    return aryValue;
                });
            } else {
                val = newValue.value;
            }
        } else if (field.valueType === ValueType.Group) {
            val = { name: newValue.value };
        }

        return val;
    }

    onMessageReceived(e: any): boolean {
        let handled: boolean = false;
        switch (e.type) {
            case 'error': {
                handled = true;
                this.waitForCreateOptionResponse = false;
                if (isIssueEditError(e)) {
                    this.setState({ isSomethingLoading: false, loadingField: '', isErrorBannerOpen: true, errorDetails: e.reason, fieldValues: { ...this.state.fieldValues, ...e.fieldValues } });
                } else {
                    this.setState({ isSomethingLoading: false, loadingField: '', isErrorBannerOpen: true, errorDetails: e.reason });
                }
                break;
            }
            case 'fieldValueUpdate': {
                handled = true;
                this.setState({ isSomethingLoading: false, loadingField: '', fieldValues: { ...this.state.fieldValues, ...e.fieldValues } });
                break;
            }
            case 'issueSuggestionsList': {
                handled = true;
                this.selectSuggestions = (e as IssueSuggestionsList).issues;
                break;
            }
            case 'selectOptionsList': {
                handled = true;
                this.selectSuggestions = e.options;
                break;
            }
            case 'optionCreated': {
                handled = true;
                if (isCreatedSelectOption(e)) {
                    this.waitForCreateOptionResponse = false;
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

    protected isClearableSelect = (field: SelectFieldUI): boolean => {
        if (!field.required) { return true; }

        if (field.isMulti && this.state.fieldValues[field.key] && this.state.fieldValues[field.key].length > 0) {
            return true;
        }

        return false;
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
            this.selectSuggestions = undefined;
            this.postMessage({ action: 'fetchIssues', query: input, site: this.state.siteDetails, autocompleteUrl: field.autoCompleteUrl });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if (this.selectSuggestions !== undefined || (end - start) > 2000) {
                    if (this.selectSuggestions === undefined) {
                        this.selectSuggestions = [];
                    }

                    clearInterval(timer);
                    this.setState({ isSomethingLoading: false, loadingField: '' });
                    resolve(this.selectSuggestions);
                }
            }, 100);
        });
    }

    protected loadSelectOptionsForField = async (field: SelectFieldUI, input: string): Promise<any[]> => {
        this.setState({ isSomethingLoading: true, loadingField: field.key });
        return this.loadSelectOptions(input, field.autoCompleteUrl);
    }

    protected loadSelectOptions = async (input: string, url: string): Promise<any[]> => {
        this.setState({ isSomethingLoading: true });
        return new Promise(resolve => {
            this.selectSuggestions = undefined;
            this.postMessage({ action: 'fetchSelectOptions', query: input, site: this.state.siteDetails, autocompleteUrl: url });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if (this.selectSuggestions !== undefined || (end - start) > 2000) {
                    if (this.selectSuggestions === undefined) {
                        this.selectSuggestions = [];
                    }

                    clearInterval(timer);
                    this.setState({ isSomethingLoading: false, loadingField: '' });
                    resolve(this.selectSuggestions);
                }
            }, 100);
        });
    }

    // react-select has issues and doesn't stop propagation on click events when you provide
    // a custom option component.  e.g. it calls this twice, so we have to debounce.
    // see: https://github.com/JedWatson/react-select/issues/2477
    // and more importantly: https://github.com/JedWatson/react-select/issues/2326
    handleSelectOptionCreate = debounce((field: SelectFieldUI, input: string): void => {
        if (!this.waitForCreateOptionResponse) {
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
                        this.waitForCreateOptionResponse = false;
                        clearInterval(timer);
                    }
                }, 100);
            }
        }
    }, 100);

    /*
    Attachment = 'attachment',
    */
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
                            value={(this.state.fieldValues[field.key]) ? this.state.fieldValues[field.key] : ""}
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
                                if (fieldArgs.error && fieldArgs.error !== '') {
                                    console.log(`${field.name} error`, fieldArgs.error);
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
            case UIType.Date: {
                let markup = <div></div>;
                let validateFunc = this.getValidateFunction(field, editmode);
                if (editmode) {
                    markup = <DatePicker
                        id={field.key}
                        name={field.key}
                        isLoading={this.state.loadingField === field.key}
                        defaultValue={this.state.fieldValues[field.key]}
                        isDisabled={this.state.isSomethingLoading}
                        className="ac-select-container"
                        selectProps={{ className: "ac-select-container", classNamePrefix: "ac-select" }}
                        onChange={(val: string) => {
                            // DatePicker re-opens when it gains focus with no way to turn that off.
                            // this is why we have to blur so a re-render doesn't re-open it.
                            (document.activeElement as HTMLElement).blur();
                            this.handleInlineEdit(field, val);
                        }}
                    />;

                    return markup;
                }

                return (
                    <Field
                        label={field.name}
                        isRequired={field.required}
                        id={field.key}
                        name={field.key}
                        validate={validateFunc}
                    >
                        {
                            (fieldArgs: any) => {
                                let errDiv = <span />;
                                if (fieldArgs.error === 'EMPTY') {
                                    errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                }
                                return (
                                    <div>
                                        <DatePicker
                                            {...fieldArgs.fieldProps}
                                            isDisabled={this.state.isSomethingLoading}
                                            className="ac-select-container"
                                            selectProps={{ className: "ac-select-container", classNamePrefix: "ac-select" }}
                                        />
                                        {errDiv}
                                    </div>
                                );
                            }
                        }
                    </Field>
                );
            }
            case UIType.DateTime: {
                let markup = <div></div>;
                let validateFunc = this.getValidateFunction(field, editmode);
                if (editmode) {
                    markup = <DateTimePicker
                        id={field.key}
                        name={field.key}
                        defaultValue={this.state.fieldValues[field.key]}
                        isDisabled={this.state.isSomethingLoading}
                        className="ac-select-container"
                        datePickerSelectProps={{ className: "ac-select-container", classNamePrefix: "ac-select" }}
                        timePickerSelectProps={{ className: "ac-select-container", classNamePrefix: "ac-select" }}
                        onChange={(val: string) => {
                            // DatePicker re-opens when it gains focus with no way to turn that off.
                            // this is why we have to blur so a re-render doesn't re-open it.
                            (document.activeElement as HTMLElement).blur();
                            this.handleInlineEdit(field, val);
                        }}
                    />;

                    return markup;
                }

                return (
                    <Field
                        label={field.name}
                        isRequired={field.required}
                        id={field.key}
                        name={field.key}
                        validate={validateFunc}
                    >
                        {
                            (fieldArgs: any) => {
                                let errDiv = <span />;
                                if (fieldArgs.error === 'EMPTY') {
                                    errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                }
                                return (
                                    <div>
                                        <DateTimePicker
                                            {...fieldArgs.fieldProps}
                                            isDisabled={this.state.isSomethingLoading}
                                            className="ac-select-container"
                                            datePickerSelectProps={{ className: "ac-select-container", classNamePrefix: "ac-select" }}
                                            timePickerSelectProps={{ className: "ac-select-container", classNamePrefix: "ac-select" }}
                                        />
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
                        <Button className='ac-button' onClick={this.handleCommentSaveClick} isDisabled={this.state.commentInputValue === '' || this.state.isSomethingLoading}>Save</Button>
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

                // Note: react-select doesn't let you set an initial value as a string.
                // it must be an object or an array (ugh.)
                let defVal = this.state.fieldValues[field.key];
                if (typeof this.state.fieldValues[field.key] === 'string') {
                    defVal = { label: defVal, value: defVal };
                }

                const commonProps: any = {
                    isMulti: selectField.isMulti,
                    className: "ac-select-container",
                    classNamePrefix: "ac-select",
                    getOptionLabel: SelectFieldHelper.labelFuncForValueType(selectField.valueType),
                    getOptionValue: SelectFieldHelper.valueFuncForValueType(selectField.valueType),
                    components: SelectFieldHelper.getComponentsForValueType(selectField.valueType),
                };

                if (editmode) {
                    commonProps.label = field.name;
                    commonProps.id = field.key;
                    commonProps.name = field.key;
                    commonProps.defaultValue = defVal;
                }

                switch (SelectFieldHelper.selectComponentType(selectField)) {
                    case SelectFieldHelper.SelectComponentType.Select: {
                        if (editmode) {
                            return (
                                <Select
                                    {...commonProps}
                                    isClearable={this.isClearableSelect(selectField)}
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
                                defaultValue={defVal}>
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
                                                    isClearable={this.isClearableSelect(selectField)}
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
                                    value={this.state.fieldValues[field.key]}
                                    isClearable={this.isClearableSelect(selectField)}
                                    options={this.state.selectFieldOptions[field.key]}
                                    isDisabled={this.state.isSomethingLoading}
                                    isLoading={this.state.loadingField === field.key}
                                    isValidNewOption={shouldShowCreateOption}
                                    placeholder='Type to create new option'
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
                                defaultValue={defVal}>
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
                                                    placeholder='Type to create new option'
                                                    isClearable={this.isClearableSelect(selectField)}
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
                                <AsyncSelect
                                    {...commonProps}
                                    placeholder='Type to search'
                                    isClearable={this.isClearableSelect(selectField)}
                                    isDisabled={this.state.isSomethingLoading && this.state.loadingField !== field.key}
                                    options={this.state.selectFieldOptions[field.key]}
                                    isLoading={this.state.loadingField === field.key}
                                    onChange={(selected: any) => { this.handleSelectChange(selectField, selected); }}
                                    loadOptions={async (input: any) => this.loadSelectOptionsForField(field as SelectFieldUI, input)}
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
                                defaultValue={defVal}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                        }
                                        return (
                                            <React.Fragment>
                                                <AsyncSelect
                                                    {...fieldArgs.fieldProps}
                                                    {...commonProps}
                                                    placeholder='Type to search'
                                                    isDisabled={this.state.isSomethingLoading && this.state.loadingField !== field.key}
                                                    isClearable={this.isClearableSelect(selectField)}
                                                    options={this.state.selectFieldOptions[field.key]}
                                                    isLoading={this.state.loadingField === field.key}
                                                    onChange={(selected: any) => { this.handleSelectChange(selectField, selected); }}
                                                    loadOptions={async (input: any) => this.loadSelectOptionsForField(field as SelectFieldUI, input)}
                                                />
                                                {errDiv}
                                            </React.Fragment>
                                        );
                                    }
                                }
                            </Field>
                        );
                    }

                    case SelectFieldHelper.SelectComponentType.AsyncCreatable: {
                        let onCreateFunc: any = undefined;
                        let newDataFunc: any = undefined;

                        if (selectField.createUrl.trim() !== '') {
                            onCreateFunc = (input: any): void => { this.handleSelectOptionCreate(selectField, input); };
                        } else {
                            newDataFunc = (inputValue: any, optionLabel: any) => { return { label: optionLabel, value: inputValue }; };
                        }

                        if (editmode) {
                            return (
                                <AsyncCreatableSelect
                                    {...commonProps}
                                    value={this.state.fieldValues[field.key]}
                                    placeholder='Type to search'
                                    isDisabled={this.state.isSomethingLoading && this.state.loadingField !== field.key}
                                    isClearable={this.isClearableSelect(selectField)}
                                    options={this.state.selectFieldOptions[field.key]}
                                    isLoading={this.state.loadingField === field.key}
                                    isValidNewOption={shouldShowCreateOption}
                                    onCreateOption={onCreateFunc}
                                    getNewOptionData={newDataFunc}
                                    onChange={(selected: any) => { this.handleSelectChange(selectField, selected); }}
                                    loadOptions={async (input: any) => this.loadSelectOptionsForField(field as SelectFieldUI, input)}
                                >
                                </AsyncCreatableSelect>
                            );
                        }

                        //create mode
                        return (
                            <Field label={field.name}
                                isRequired={field.required}
                                id={field.key}
                                name={field.key}
                                validate={validateFunc}
                                defaultValue={defVal}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                        }
                                        return (
                                            <React.Fragment>
                                                <AsyncCreatableSelect
                                                    {...fieldArgs.fieldProps}
                                                    {...commonProps}
                                                    placeholder='Type to search'
                                                    isDisabled={this.state.isSomethingLoading && this.state.loadingField !== field.key}
                                                    isClearable={this.isClearableSelect(selectField)}
                                                    options={this.state.selectFieldOptions[field.key]}
                                                    isLoading={this.state.loadingField === field.key}
                                                    isValidNewOption={shouldShowCreateOption}
                                                    onCreateOption={onCreateFunc}
                                                    getNewOptionData={newDataFunc}
                                                    onChange={(selected: any) => { this.handleSelectChange(selectField, selected); }}
                                                    loadOptions={async (input: any) => this.loadSelectOptionsForField(field as SelectFieldUI, input)}
                                                >
                                                </AsyncCreatableSelect>
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
            case UIType.Checkbox: {
                if (editmode) {
                    const optionableField = field as OptionableFieldUI;

                    const commonProps: any = {
                        isMulti: true,
                        className: "ac-select-container",
                        classNamePrefix: "ac-select",
                        getOptionLabel: SelectFieldHelper.labelFuncForValueType(field.valueType),
                        getOptionValue: SelectFieldHelper.valueFuncForValueType(field.valueType),
                        components: SelectFieldHelper.getComponentsForValueType(field.valueType),
                        label: field.name,
                        id: field.key,
                        name: field.key,
                        defaultValue: this.state.fieldValues[field.key],
                        isClearable: true,
                    };

                    return (<Select
                        {...commonProps}
                        isClearable={true}
                        options={optionableField.allowedValues}
                        isDisabled={this.state.isSomethingLoading}
                        onChange={(selected: any) => { this.handleSelectChange(optionableField, selected); }}
                    />);
                }

                let checkboxItems: any[] = [];
                const checkField = field as OptionableFieldUI;
                checkField.allowedValues.forEach(value => {
                    checkboxItems.push(
                        <CheckboxField name={field.key} id={field.key} value={value.id} isRequired={field.required}>
                            {
                                (fieldArgs: any) => {
                                    return (<Checkbox {...fieldArgs.fieldProps} label={value.value} />);
                                }
                            }
                        </CheckboxField>

                    );
                });

                return (
                    <Fieldset legend={field.name}>
                        {checkboxItems}
                    </Fieldset>
                );
            }
            case UIType.Radio: {
                if (editmode) {
                    const optionableField = field as OptionableFieldUI;

                    const commonProps: any = {
                        isMulti: false,
                        className: "ac-select-container",
                        classNamePrefix: "ac-select",
                        getOptionLabel: SelectFieldHelper.labelFuncForValueType(field.valueType),
                        getOptionValue: SelectFieldHelper.valueFuncForValueType(field.valueType),
                        components: SelectFieldHelper.getComponentsForValueType(field.valueType),
                        label: field.name,
                        id: field.key,
                        name: field.key,
                        defaultValue: this.state.fieldValues[field.key],
                        isClearable: !field.required,
                    };

                    return (<Select
                        {...commonProps}
                        isClearable={true}
                        options={optionableField.allowedValues}
                        isDisabled={this.state.isSomethingLoading}
                        onChange={(selected: any) => { this.handleSelectChange(optionableField, selected); }}
                    />);
                }

                let radioItems: any[] = [];
                const radioField = field as OptionableFieldUI;
                radioField.allowedValues.forEach(value => {
                    radioItems.push({ name: field.key, label: value.value, value: value.id });
                });

                let validateFunc = field.required ? FieldValidators.validateMultiSelect : undefined;
                return (
                    <Field label={field.name} isRequired={field.required} id={field.key} name={field.key} validate={validateFunc}>
                        {
                            (fieldArgs: any) => {
                                return (<RadioGroup {...fieldArgs.fieldProps} options={radioItems} />);
                            }
                        }
                    </Field>
                );
            }
            case UIType.Timetracking: {
                let validateFunc = this.getValidateFunction(field, editmode);
                if (editmode) {
                    const hasValue: boolean = this.state.fieldValues[field.key]
                        && this.state.fieldValues[field.key].originalEstimate
                        && this.state.fieldValues[field.key].originalEstimate.trim() !== '';
                    return (
                        <div>
                            <EdiText
                                type='text'
                                value={(hasValue) ? this.state.fieldValues[field.key].originalEstimate : "0m"}
                                onSave={(val: string) => { this.handleInlineEdit(field, val); }}
                                inputProps={{ className: 'ac-inputField' }}
                                viewProps={{ id: field.key, className: 'ac-inline-input-view-p' }}
                                editButtonClassName='ac-hidden'
                                cancelButtonClassName='ac-inline-cancel-button'
                                saveButtonClassName='ac-inline-save-button'
                                editOnViewClick={true}
                            />
                            <HelperMessage>(eg. 3w 4d 12h)</HelperMessage>
                        </div>
                    );
                }

                return (
                    <div className='ac-flex'>
                        <Field
                            label='Original estimate'
                            isRequired={field.required}
                            id={`${field.key}.originalEstimate`}
                            name={`${field.key}.originalEstimate`}
                            validate={validateFunc}>
                            {
                                (fieldArgs: any) => {
                                    let errDiv = <span />;
                                    if (fieldArgs.error === 'EMPTY') {
                                        errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                    }
                                    return (
                                        <div>
                                            <input {...fieldArgs.fieldProps} className='ac-inputField' />
                                            <HelperMessage>(eg. 3w 4d 12h)</HelperMessage>
                                            {errDiv}
                                        </div>
                                    );
                                }
                            }
                        </Field>
                        <div className='ac-inline-flex-hpad'></div>
                        <Field
                            label='Remaining estimate'
                            isRequired={field.required}
                            id={`${field.key}.remainingEstimate`}
                            name={`${field.key}.remainingEstimate`}
                            validate={validateFunc}>
                            {
                                (fieldArgs: any) => {
                                    let errDiv = <span />;
                                    if (fieldArgs.error === 'EMPTY') {
                                        errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                    }
                                    return (
                                        <div>
                                            <input {...fieldArgs.fieldProps} className='ac-inputField' />
                                            <HelperMessage>(eg. 3w 4d 12h)</HelperMessage>
                                            {errDiv}
                                        </div>
                                    );
                                }
                            }
                        </Field>
                    </div>
                );
            }
            case UIType.Worklog: {
                if (editmode) {

                    return (
                        <div>don't call getInputMarkup for worklog in editmode</div>
                    );
                }

                let validateFunc = FieldValidators.validateString;
                return (
                    <React.Fragment>
                        <div style={{ display: field.required ? 'none' : 'block' }}>
                            <Field
                                id={`${field.key}.enabled`}
                                name={`${field.key}.enabled`}>
                                {
                                    (fieldArgs: any) => <Checkbox {...fieldArgs.fieldProps} label='Log work' />
                                }
                            </Field>
                        </div>
                        <Condition when='worklog.enabled' is={true}>
                            <div className='ac-flex'>
                                <Field
                                    label='Worklog time spent'
                                    isRequired={true}
                                    id={`${field.key}.timeSpent`}
                                    name={`${field.key}.timeSpent`}
                                    validate={validateFunc}>
                                    {
                                        (fieldArgs: any) => {
                                            let errDiv = <span />;
                                            if (fieldArgs.error === 'EMPTY') {
                                                errDiv = <ErrorMessage>Time spent is required</ErrorMessage>;
                                            }
                                            return (
                                                <div>
                                                    <input {...fieldArgs.fieldProps} className='ac-inputField' />
                                                    <HelperMessage>(eg. 3w 4d 12h)</HelperMessage>
                                                    {errDiv}
                                                </div>
                                            );
                                        }
                                    }
                                </Field>
                                <div className='ac-inline-flex-hpad'></div>
                                <Field
                                    label='Remaining estimate'
                                    isRequired={true}
                                    id={`${field.key}.newEstimate`}
                                    name={`${field.key}.newEstimate`}
                                    validate={validateFunc}>
                                    {
                                        (fieldArgs: any) => {
                                            let errDiv = <span />;
                                            if (fieldArgs.error === 'EMPTY') {
                                                errDiv = <ErrorMessage>Remaining estimate is required</ErrorMessage>;
                                            }
                                            return (
                                                <div>
                                                    <input {...fieldArgs.fieldProps} className='ac-inputField' />
                                                    <HelperMessage>(eg. 3w 4d 12h)</HelperMessage>
                                                    {errDiv}
                                                </div>
                                            );
                                        }
                                    }
                                </Field>
                            </div>
                            <Field
                                label='Worklog start time'
                                isRequired={true}
                                id={`${field.key}.started`}
                                name={`${field.key}.started`}
                                validate={validateFunc}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>Start time is required</ErrorMessage>;
                                        }
                                        return (
                                            <div>
                                                <DateTimePicker
                                                    {...fieldArgs.fieldProps}
                                                    className="ac-select-container"
                                                    timeIsEditable
                                                    datePickerSelectProps={{ className: "ac-select-container", classNamePrefix: "ac-select" }}
                                                    timePickerSelectProps={{ className: "ac-select-container", classNamePrefix: "ac-select" }}
                                                />
                                                {errDiv}
                                            </div>
                                        );
                                    }
                                }
                            </Field>
                            <Field
                                label='Worklog comment'
                                isRequired={false}
                                id={`${field.key}.comment`}
                                name={`${field.key}.comment`}
                                validate={validateFunc}>
                                {
                                    (fieldArgs: any) => {
                                        let errDiv = <span />;
                                        if (fieldArgs.error === 'EMPTY') {
                                            errDiv = <ErrorMessage>Comment is required</ErrorMessage>;
                                        }
                                        return (
                                            <div>
                                                <textarea {...fieldArgs.fieldProps}
                                                    style={{ width: '100%', display: 'block' }}
                                                    className='ac-textarea'
                                                    rows={5}
                                                />
                                                {errDiv}
                                            </div>
                                        );
                                    }
                                }
                            </Field>
                        </Condition>
                    </React.Fragment>
                );
            }
            case UIType.Participants: {
                return (
                    <ParticipantList users={this.state.fieldValues[field.key]} />
                );
            }
            case UIType.NonEditable: {
                let value = this.state.fieldValues[field.key];
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                return (
                    <div>{value}</div>
                );
            }
            case UIType.Attachment: {
                if (editmode) {
                    return (
                        <div />
                    );
                }
            }

        }

        // catch-all for unknown field types
        let validateFunc = field.required ? FieldValidators.validateString : undefined;

        if (editmode) {
            return (
                <div style={{ color: 'red' }}>Unknown field type - {field.key} : {field.uiType}</div>
            );
        }
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
                    valfunc = (field.required) ? FieldValidators.isValidRequiredNumber : FieldValidators.isValidNumber;
                } else {
                    valfunc = (field.required) ? FieldValidators.validateRequiredNumber : FieldValidators.validateNumber;
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

        console.log(`returning validate func for ${field.name}`, valfunc);
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
