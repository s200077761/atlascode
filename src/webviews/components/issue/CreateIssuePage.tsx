import * as React from 'react';
import { Action, HostErrorMessage } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreateIssueData, ProjectList, CreatedSomething, isCreatedSomething, isIssueCreated, LabelList, UserList, PreliminaryIssueData, IssueSuggestionsList, JqlOptionsList } from '../../../ipc/issueMessaging';
import { emptyWorkingProject, WorkingProject } from '../../../config/model';
import { FetchQueryAction, ScreensForProjectsAction, CreateSomethingAction, CreateIssueAction, OpenJiraIssueAction, FetchByProjectQueryAction, SetIssueTypeAction, FetchIssueFieldOptionsByJQLAction } from '../../../ipc/issueActions';
import Form, { Field, Fieldset, FormFooter, ErrorMessage, CheckboxField, HelperMessage } from '@atlaskit/form';
import Select, { AsyncCreatableSelect, AsyncSelect, CreatableSelect, components } from '@atlaskit/select';
import { RadioGroup } from '@atlaskit/radio';
import { Checkbox } from '@atlaskit/checkbox';
import Button from '@atlaskit/button';
import { DatePicker, DateTimePicker } from '@atlaskit/datetime-picker';
import Avatar from '@atlaskit/avatar';
import Panel from '@atlaskit/panel';
import Page, { Grid, GridColumn } from "@atlaskit/page";
import SectionMessage from '@atlaskit/section-message';
import { FieldValidators, chain } from '../fieldValidators';
import ErrorBanner from '../ErrorBanner';
import Offline from '../Offline';
import { epicsDisabled } from '../../../jira/jiraCommon';
import { UIType, SelectFieldUI, FieldUI, InputFieldUI, InputValueType, OptionableFieldUI } from '../../../jira/jira-client/model/fieldUI';
import { JiraClient } from '../../../jira/jira-client/client';
import { isOAuthInfo } from '../../../atlclients/authInfo';
import { JiraCloudClient } from '../../../jira/jira-client/cloudClient';

const createdFromAtlascodeFooter = `\n\n_~Created from~_ [_~Atlassian for VS Code~_|https://marketplace.visualstudio.com/items?itemName=Atlassian.atlascode]`;

type Emit = FetchQueryAction
    | FetchByProjectQueryAction
    | ScreensForProjectsAction
    | CreateSomethingAction
    | CreateIssueAction
    | OpenJiraIssueAction
    | SetIssueTypeAction
    | FetchIssueFieldOptionsByJQLAction
    | Action;

type Accept = CreateIssueData | ProjectList | CreatedSomething | LabelList | UserList | HostErrorMessage;
type IssueType = { id: string, name: string, iconUrl: string };

interface ViewState extends CreateIssueData {
    isSomethingLoading: boolean;
    loadingField: string;
    fieldOptions: { [k: string]: any };
    isCreateBannerOpen: boolean;
    isErrorBannerOpen: boolean;
    errorDetails: any;
    createdIssue: any;
    defaultIssueType: any;
    fieldValues: { [k: string]: any };
    isOnline: boolean;
}
const emptyState: ViewState = {
    type: '',
    selectedProject: emptyWorkingProject,
    availableProjects: [],
    selectedIssueTypeId: '',
    defaultIssueType: {},
    issueTypeScreens: {},
    fieldValues: {
        description: createdFromAtlascodeFooter
    },
    fieldOptions: {},
    isSomethingLoading: false,
    loadingField: '',
    isCreateBannerOpen: false,
    isErrorBannerOpen: false,
    errorDetails: undefined,
    isOnline: true,
    createdIssue: {},
    epicFieldInfo: epicsDisabled,
    transformerProblems: {},
};

// Used to render custom select options with icons
const { Option } = components;
const IconOption = (props: any) => (
    <Option {...props}>
        <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', alignItems: 'center' }}><img src={props.data.iconUrl} width="24" height="24" /><span style={{ marginLeft: '10px' }}>{props.label}</span></div>
    </Option>
);

const IconValue = (props: any) => (
    <components.SingleValue {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}><img src={props.data.iconUrl} width="16" height="16" /><span style={{ marginLeft: '10px' }}>{props.data.name}</span></div>
    </components.SingleValue >

);

const UserOption = (props: any) => {
    let avatar = (props.data.avatarUrls && props.data.avatarUrls['24x24']) ? props.data.avatarUrls['24x24'] : '';
    return (
        <Option {...props}>
            <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', alignItems: 'center' }}><Avatar size='medium' borderColor='var(--vscode-dropdown-foreground)!important' src={avatar} /><span style={{ marginLeft: '4px' }}>{props.data.displayName}</span></div>
        </Option>
    );
};

const UserValue = (props: any) => {
    let avatar = (props.data.avatarUrls && props.data.avatarUrls['24x24']) ? props.data.avatarUrls['24x24'] : '';
    return (
        <components.SingleValue {...props}>
            <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', alignItems: 'center' }}><Avatar size='small' borderColor='var(--vscode-dropdown-foreground)!important' src={avatar} /><span style={{ marginLeft: '4px' }}>{props.data.displayName}</span></div>
        </components.SingleValue>
    );
};

const IssueSuggestionOption = (props: any) => (
    <Option {...props}>
        <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', alignItems: 'center' }}><span style={{ marginLeft: '10px' }}>{props.data.key}</span><span style={{ marginLeft: '1em' }} dangerouslySetInnerHTML={{ __html: props.data.summary }} /></div>
    </Option>
);

const IssueSuggestionValue = (props: any) => (
    <components.MultiValueLabel {...props}>
        <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', alignItems: 'center' }}><span style={{ marginLeft: '4px' }}>{props.data.key}</span><span style={{ marginLeft: '4px', marginRight: '4px' }}>{props.data.summaryText}</span></div>
    </components.MultiValueLabel>

);

const Condition = ({ when, is, children }: any) => {
    return <Field name={when} subscription={{ value: false }}>
        {({ fieldProps }: { fieldProps: any }) => {
            return (fieldProps && fieldProps.value && fieldProps.value === is ? children : null);
        }}
    </Field>;
};

export default class CreateIssuePage extends WebviewComponent<Emit, Accept, {}, ViewState> {
    private newProjects: WorkingProject[] = [];
    private issueTypes: any[] = [];
    private labelSuggestions: string[] | undefined = undefined;
    private userSuggestions: any[] | undefined = undefined;
    private issueSuggestions: any[] | undefined = undefined;
    private jqlOptions: any[] | undefined = undefined;
    private newOption: any;
    private fileUpload: HTMLInputElement | null;

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    refreshSelectFields(issueTypeId: string | undefined, issueData: CreateIssueData): Object {
        let fieldOptions = {};
        if (issueTypeId) {
            let selectFields = issueData.issueTypeScreens[issueTypeId].fields.filter(field => { return field.uiType === UIType.Select || field.uiType === UIType.IssueLink; });

            selectFields.forEach(field => {
                fieldOptions[field.key] = this.getSelectOptions(issueTypeId, field.key, issueData);
            });
        }
        return fieldOptions;
    }

    getSelectOptions(issueTypeId: string | undefined, fieldKey: string, issueData: CreateIssueData): any[] {
        let opts: any[] = new Array();

        if (issueTypeId) {
            const field: SelectFieldUI | undefined = issueData.issueTypeScreens[issueTypeId].fields.find(field => field.key === fieldKey) as SelectFieldUI | undefined;
            if (field && field.allowedValues && field.allowedValues.length > 0) {
                switch (fieldKey) {
                    case 'fixVersions':
                    case 'versions': {
                        let unreleasedOpts = field.allowedValues.filter(opt => { return !opt.released && !opt.archived; });
                        let releasedOpts = field.allowedValues.filter(opt => { return opt.released && !opt.archived; });

                        opts = [
                            { label: 'Unreleased Versions', options: unreleasedOpts }
                            , { label: 'Released Versions', options: releasedOpts }
                        ];
                        break;
                    }
                    case 'issuelinks': {
                        field.allowedValues.forEach(opt => {
                            opts.push({ ...opt, name: opt.inward, type: 'inward' });
                            opts.push({ ...opt, name: opt.outward, type: 'outward' });
                        });
                        break;
                    }

                    default: {
                        field.allowedValues.forEach(opt => { opts.push(opt); });
                        break;
                    }
                }
            }
        }

        return opts;
    }

    onMessageReceived(e: any): void {
        switch (e.type) {
            case 'error': {
                this.setState({ isSomethingLoading: false, loadingField: '', isErrorBannerOpen: true, errorDetails: e.reason });

                break;
            }
            case 'screenRefresh': {
                const issueData = e as CreateIssueData;
                this.issueTypes = Object.entries(issueData.issueTypeScreens).map(([key, value]) => { return { id: value.id, name: value.name, iconUrl: value.iconUrl }; });

                const selectedType = this.issueTypes.find(it => it.id === issueData.selectedIssueTypeId);
                this.setState({ ...issueData, ...{ isSomethingLoading: false, loadingField: '', defaultIssueType: selectedType, fieldOptions: this.refreshSelectFields(issueData.selectedIssueTypeId, issueData) } });
                break;
            }
            case 'projectList': {
                this.newProjects = (e as ProjectList).availableProjects;
                break;
            }
            case 'labelList': {
                this.labelSuggestions = (e as LabelList).labels;
                break;
            }
            case 'userList': {
                this.userSuggestions = (e as UserList).users;
                break;
            }
            case 'issueSuggestionsList': {
                this.issueSuggestions = (e as IssueSuggestionsList).issues;
                break;
            }
            case 'jqlOptionsList': {
                this.jqlOptions = (e as JqlOptionsList).options;
                break;
            }
            case 'preliminaryIssueData': {
                const data = e as PreliminaryIssueData;
                this.setState({ fieldValues: { ...this.state.fieldValues, ...{ description: `${data.description}${createdFromAtlascodeFooter}`, summary: data.summary } } });
                break;
            }
            case 'optionCreated': {
                if (isCreatedSomething(e)) {
                    this.newOption = e.createdData;
                }
                break;
            }
            case 'issueCreated': {
                if (isIssueCreated(e)) {
                    this.submitAttachment(e.issueData)
                        .catch((err) => this.onMessageReceived({ type: 'error', reason: `error uploading attachment: ${err}` }))
                        .then(() => this.setState({ isSomethingLoading: false, loadingField: '', isCreateBannerOpen: true, createdIssue: e.issueData, fieldValues: { ...this.state.fieldValues, ...{ description: createdFromAtlascodeFooter, summary: '' } } }));
                }
                break;
            }
            case 'onlineStatus': {
                this.setState({ isOnline: e.isOnline });

                if (e.isOnline && (!this.state.selectedIssueTypeId || this.state.selectedIssueTypeId === '')) {
                    this.postMessage({ action: 'refresh' });
                }

                break;
            }
            default: {
                break;
            }
        }
    }

    loadProjectOptions = (input: string): Promise<any> => {
        return new Promise(resolve => {
            this.newProjects = [];
            this.postMessage({ action: 'fetchProjects', query: input });
            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if (this.newProjects.length > 0 || (end - start) > 2000) {
                    clearInterval(timer);
                    resolve(this.newProjects);
                }
            }, 100);
        });
    }

    handleProjectChange = (selected: WorkingProject): void => {
        this.state = emptyState;
        this.setState({ ...emptyState, ...{ isSomethingLoading: true, loadingField: '' } });
        this.postMessage({ action: 'getScreensForProject', project: selected });
    }

    handleIssueTypeChange = (newType: IssueType): IssueType => {
        if (newType.id !== this.state.selectedIssueTypeId) {
            this.postMessage({ action: 'setIssueType', id: newType.id });
            this.setState((oldState, props) => {
                return {
                    selectedIssueTypeId: newType.id,
                    fieldOptions: this.refreshSelectFields(newType.id, oldState)
                };
            });
        }

        return newType;
    }

    handleSelectChange = (selected: any, fieldKey: string): void => {
        this.state.fieldValues[fieldKey] = selected;
    }

    handleOptionCreate = (input: any, fieldKey: string): void => {
        this.newOption = undefined;
        this.setState({ isSomethingLoading: true, loadingField: fieldKey });
        this.postMessage({ action: 'createOption', createData: { fieldKey: fieldKey, name: input, project: this.state.selectedProject.key } });

        const start = Date.now();
        let timer = setInterval(() => {
            const end = Date.now();
            if (this.newOption && this.newOption.id.length > 0) {
                clearInterval(timer);
                this.setState((oldState, props) => {

                    if (!oldState.fieldValues[fieldKey]) {
                        oldState.fieldValues[fieldKey] = [];
                    }

                    if (!oldState.fieldOptions[fieldKey]) {
                        oldState.fieldOptions[fieldKey] = [];
                    }

                    let newOptions = oldState.fieldOptions[fieldKey];

                    if (fieldKey === 'versions' || fieldKey === 'fixVersions') {
                        newOptions[0].options.push(this.newOption);
                    } else {
                        newOptions.push(this.newOption);
                    }
                    return {
                        isSomethingLoading: false,
                        loadingField: '',
                        fieldValues: { ...oldState.fieldValues, ...{ [fieldKey]: [...oldState.fieldValues[fieldKey], ...[this.newOption]] } },
                        fieldOptions: { ...oldState.fieldOptions, ...{ [fieldKey]: newOptions } }
                    };
                });
            } else if ((end - start) > 2000) {
                clearInterval(timer);
                this.setState({ isSomethingLoading: false, loadingField: '' });
            }
        }, 100);
    }

    loadLabelOptions = (input: string): Promise<any> => {
        return new Promise(resolve => {
            this.labelSuggestions = undefined;
            this.postMessage({ action: 'fetchLabels', query: input });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if (this.labelSuggestions !== undefined || (end - start) > 2000) {
                    if (this.labelSuggestions === undefined) {
                        this.labelSuggestions = [];
                    }

                    clearInterval(timer);
                    this.setState({ isSomethingLoading: false, loadingField: '' });
                    resolve(this.labelSuggestions);
                }
            }, 100);
        });
    }

    loadUserOptions = (input: string): Promise<any> => {
        return new Promise(resolve => {
            this.userSuggestions = undefined;
            this.postMessage({ action: 'fetchUsers', query: input, project: this.state.selectedProject.key });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if (this.userSuggestions !== undefined || (end - start) > 2000) {
                    if (this.userSuggestions === undefined) {
                        this.userSuggestions = [];
                    }

                    clearInterval(timer);
                    this.setState({ isSomethingLoading: false, loadingField: '' });
                    resolve(this.userSuggestions);
                }
            }, 100);
        });
    }

    loadIssueOptions = (input: string): Promise<any> => {
        return new Promise(resolve => {
            this.issueSuggestions = undefined;
            this.postMessage({ action: 'fetchIssues', query: input });

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

    loadJqlOptions = (jql: string, fieldId: string): Promise<any> => {
        return new Promise(resolve => {
            this.issueSuggestions = undefined;
            this.postMessage({ action: 'fetchOptionsJql', jql: jql, fieldId: fieldId });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if (this.jqlOptions !== undefined || (end - start) > 2000) {
                    if (this.jqlOptions === undefined) {
                        this.jqlOptions = [];
                    }

                    clearInterval(timer);
                    this.setState({ isSomethingLoading: false, loadingField: '' });
                    resolve(this.jqlOptions);
                }
            }, 100);
        });
    }

    submitAttachment = async (issueData: any) => {
        const formdata = new FormData();
        if (!this.fileUpload || !this.fileUpload.files) {
            return;
        }
        for (var i = 0; i < this.fileUpload.files.length; i++) {
            const file = this.fileUpload.files[i];
            formdata.append('file', file);
        }

        let client: JiraClient | undefined = undefined;
        if (isOAuthInfo(issueData.site)) {
            client = new JiraCloudClient(issueData.token, issueData.site);
        } else {
            // TODO: [VSCODE-572] Handle authing with jira within a webview in a better way.
        }

        if (client) {
            await client.addAttachment(issueData.key, formdata);
        }

        this.fileUpload.value = '';
    }

    handleSubmit = async (e: any) => {
        let requiredFields = this.state.issueTypeScreens[this.state.selectedIssueTypeId!].fields.filter(field => { return field.required; });
        let errs = {};
        requiredFields.forEach((field: FieldUI) => {
            if (e[field.key] === undefined || (e[field.key].length < 1)) {
                errs[field.key] = 'EMPTY';
            }
        });


        if (Object.keys(errs).length > 0) {
            return errs;
        }

        // TODO: [VSCODE-439] find a better way to transform submit data or deal with different select option shapes
        if (e[this.state.epicFieldInfo.epicLink.id]) {
            let val: any = e[this.state.epicFieldInfo.epicLink.id];
            e[this.state.epicFieldInfo.epicLink.id] = val.id;
        }

        this.setState({ isSomethingLoading: true, loadingField: 'submitButton', isCreateBannerOpen: false });
        this.postMessage({ action: 'createIssue', issueData: e });

        return undefined;
    }

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    }

    public render() {
        let renderableFields: any[] = [];
        let advancedFields: any[] = [];

        if (this.state.selectedIssueTypeId && this.state.selectedIssueTypeId !== '') {

            const screen = this.state.issueTypeScreens[this.state.selectedIssueTypeId];
            if (screen && screen.fields && screen.fields.length > 0) {
                renderableFields = [];
                advancedFields = [];
                screen.fields.forEach(field => {
                    (field.advanced) ? advancedFields.push(this.getFieldMarkup(field)) : renderableFields.push(this.getFieldMarkup(field));

                });
            } else {
                this.setState({ isErrorBannerOpen: true, errorDetails: `No fields found for issue type ${this.state.selectedIssueTypeId}` });
            }
        } else if (!this.state.isErrorBannerOpen && this.state.isOnline) {
            return (<div>waiting for data...</div>);
        }

        return (
            <Page>
                <Grid>
                    <GridColumn medium={8}>
                        <div>
                            {!this.state.isOnline &&
                                <Offline />
                            }
                            {this.state.isCreateBannerOpen &&
                                <div className='fade-in'>
                                    <SectionMessage
                                        appearance="confirmation"
                                        title="Issue Created">
                                        <p>Issue <Button className='ac-banner-link-button' appearance="link" spacing="none" onClick={() => { console.log('sending open issue', this.state.createdIssue.key); this.postMessage({ action: 'openJiraIssue', issueKey: this.state.createdIssue.key }); }}>{this.state.createdIssue.key}</Button> has been created.</p>
                                    </SectionMessage>
                                </div>
                            }
                            {this.state.isErrorBannerOpen &&
                                <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                            }
                            <h2>Create Issue</h2>
                            <Form
                                name="create-issue"
                                onSubmit={this.handleSubmit}
                            >
                                {(frmArgs: any) => {
                                    return (<form {...frmArgs.formProps}>
                                        <Field defaultValue={this.state.selectedProject}
                                            label='Project'
                                            isRequired={true}
                                            id='project'
                                            name='project'
                                            validate={FieldValidators.validateSingleSelect}>
                                            {
                                                (fieldArgs: any) => {
                                                    let errDiv = <span />;
                                                    if (fieldArgs.error === 'EMPTY') {
                                                        errDiv = <ErrorMessage>Project is required</ErrorMessage>;
                                                    }
                                                    return (
                                                        <div>
                                                            <AsyncSelect
                                                                {...fieldArgs.fieldProps}
                                                                className="ac-select-container"
                                                                classNamePrefix="ac-select"
                                                                getOptionLabel={(option: WorkingProject) => {
                                                                    return option.name;
                                                                }}
                                                                getOptionValue={(option: WorkingProject) => {
                                                                    return option.key;
                                                                }}
                                                                onChange={chain(fieldArgs.fieldProps.onChange, this.handleProjectChange)}
                                                                defaultOptions={this.state.availableProjects}
                                                                loadOptions={this.loadProjectOptions}
                                                                placeholder="Choose a Project"
                                                                isDisabled={this.state.isSomethingLoading}
                                                                isLoading={this.state.loadingField === 'project'}
                                                            />
                                                            {errDiv}
                                                        </div>
                                                    );
                                                }
                                            }
                                        </Field>

                                        <Field defaultValue={this.state.defaultIssueType}
                                            label='Issue Type'
                                            isRequired={true}
                                            id='issuetype'
                                            name='issuetype'
                                            validate={FieldValidators.validateSingleSelect}>
                                            {
                                                (fieldArgs: any) => {
                                                    let errDiv = <span />;
                                                    if (fieldArgs.error === 'EMPTY') {
                                                        errDiv = <ErrorMessage>Issue Type is required</ErrorMessage>;
                                                    }
                                                    return (
                                                        <div>
                                                            <Select
                                                                {...fieldArgs.fieldProps}
                                                                className="ac-select-container"
                                                                classNamePrefix="ac-select"
                                                                options={this.issueTypes}
                                                                placeholder="Select Issue Type"
                                                                components={{ Option: IconOption, SingleValue: IconValue }}
                                                                getOptionLabel={(option: any) => option.name}
                                                                getOptionValue={(option: any) => option.id}
                                                                isDisabled={this.state.isSomethingLoading}
                                                                onChange={chain(fieldArgs.fieldProps.onChange, this.handleIssueTypeChange)}
                                                            />
                                                            {errDiv}
                                                        </div>
                                                    );
                                                }
                                            }
                                        </Field>

                                        {renderableFields}
                                        <Panel isDefaultExpanded={false} header={<h4>Advanced Options</h4>}>
                                            <div>{advancedFields}</div>
                                        </Panel>
                                        <FormFooter actions={{}}>
                                            <Button type="submit" className='ac-button' isDisabled={this.state.isSomethingLoading} isLoading={this.state.loadingField === 'submitButton'}>
                                                Submit
                                            </Button>
                                        </FormFooter>
                                    </form>);
                                }}
                            </Form>
                            {this.state.transformerProblems && Object.keys(this.state.transformerProblems).length > 0 &&
                                <div className='fade-in' style={{ marginTop: '20px' }}>
                                    <span>non-renderable fields detected.</span> <Button className='ac-banner-link-button' appearance="link" spacing="none" onClick={() => { this.postMessage({ action: 'openProblemReport' }); }}>View a problem report</Button>
                                </div>
                            }
                        </div>
                    </GridColumn>
                </Grid>
            </Page >
        );
    }

    getFieldMarkup(field: FieldUI): any {
        switch (field.uiType) {
            case UIType.Textarea: {
                let validateFunc = field.required ? FieldValidators.validateString : undefined;
                return (
                    <Field defaultValue={this.state.fieldValues[field.key]} label={field.name} isRequired={field.required} id={field.key} name={field.key} validate={validateFunc}>
                        {
                            (fieldArgs: any) => {
                                let errDiv = <span />;
                                if (fieldArgs.error === 'EMPTY') {
                                    errDiv =
                                        <ErrorMessage>
                                            {field.name} is required
                                </ErrorMessage>;
                                }
                                return (
                                    <div>
                                        <textarea {...fieldArgs.fieldProps}
                                            style={{ width: '100%', display: 'block' }}
                                            className='ac-textarea'
                                            rows={5}
                                            disabled={this.state.isSomethingLoading}
                                        />
                                        {errDiv}
                                    </div>
                                );
                            }
                        }
                    </Field>
                );
            }
            case UIType.Input: {
                let validateFunc = undefined;
                let valType = (field as InputFieldUI).valueType;
                switch (valType) {
                    case InputValueType.Number: {
                        validateFunc = (value: any, state: any) => {
                            if (field.required) {
                                return FieldValidators.validateRequiredNumber(value, state);
                            }

                            return FieldValidators.validateNumber(value, state);
                        };

                        break;
                    }
                    case InputValueType.Url: {
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
                                return (
                                    <div>
                                        <input {...fieldArgs.fieldProps} style={{ width: '100%', display: 'block' }} className='ac-inputField' disabled={this.state.isSomethingLoading} />
                                        {errDiv}
                                    </div>
                                );
                            }
                        }
                    </Field>
                );
            }
            case UIType.Checkbox: {
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
            case UIType.Date: {
                let validateFunc = field.required ? FieldValidators.validateString : undefined;
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
                let validateFunc = field.required ? FieldValidators.validateString : undefined;
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
            case UIType.User: {
                let validateFunc = (field.required) ? FieldValidators.validateSingleSelect : undefined;
                const selectField = field as SelectFieldUI;
                return (
                    <Field label={field.name}
                        isRequired={field.required}
                        id={field.key}
                        name={field.key}
                        validate={validateFunc}>
                        {
                            (fieldArgs: any) => {
                                let errDiv = <span />;
                                if (fieldArgs.error === 'EMPTY') {
                                    errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                }

                                return (
                                    <div>
                                        <AsyncSelect
                                            {...fieldArgs.fieldProps}
                                            className="ac-select-container"
                                            classNamePrefix="ac-select"
                                            loadOptions={this.loadUserOptions}
                                            getOptionLabel={(option: any) => option.name}
                                            getOptionValue={(option: any) => option.accountId}
                                            placeholder="Search for a User"
                                            isLoading={this.state.loadingField === field.key}
                                            isDisabled={this.state.isSomethingLoading}
                                            isMulti={selectField.isMulti}
                                            components={{ Option: UserOption, SingleValue: UserValue }}
                                        />
                                        {errDiv}
                                    </div>
                                );
                            }
                        }
                    </Field>
                );
            }
            case UIType.Select: {
                const selectField = field as SelectFieldUI;
                if (selectField.isCreateable) {
                    return this.createableSelect(selectField);
                }

                let validateFunc = (field.required) ? FieldValidators.validateSingleSelect : undefined;
                return (
                    <Field label={field.name}
                        isRequired={field.required}
                        id={field.key}
                        name={field.key}
                        validate={validateFunc}>
                        {
                            (fieldArgs: any) => {
                                let errDiv = <span />;
                                if (fieldArgs.error === 'EMPTY') {
                                    errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                }
                                if (selectField.autoCompleteJql && selectField.autoCompleteJql.length > 1) {
                                    return (
                                        <div>
                                            <AsyncSelect
                                                {...fieldArgs.fieldProps}
                                                isMulti={selectField.isMulti}
                                                isClearable={!field.required && selectField.isMulti}
                                                className="ac-select-container"
                                                classNamePrefix="ac-select"
                                                getOptionLabel={(option: any) => (option.name) ? option.name : option.value}
                                                getOptionValue={(option: any) => option.id}
                                                placeholder="Search for an issue"
                                                loadOptions={(input: any) => { return this.loadJqlOptions(selectField.autoCompleteJql, field.key); }}
                                                isLoading={this.state.loadingField === field.key}
                                                isDisabled={this.state.isSomethingLoading}
                                                components={(selectField.allowedValues.length > 0) ? { Option: IconOption, SingleValue: IconValue } : {}}
                                            />
                                            {errDiv}
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div>
                                            <Select
                                                {...fieldArgs.fieldProps}
                                                isMulti={selectField.isMulti}
                                                isClearable={!field.required && selectField.isMulti}
                                                className="ac-select-container"
                                                classNamePrefix="ac-select"
                                                getOptionLabel={(option: any) => (option.name) ? option.name : option.value}
                                                getOptionValue={(option: any) => option.id}
                                                options={this.state.fieldOptions[field.key]}
                                                components={(selectField.allowedValues.length > 0) ? { Option: IconOption, SingleValue: IconValue } : {}}
                                            />
                                            {errDiv}
                                        </div>
                                    );
                                }
                            }
                        }
                    </Field>
                );
            }
            case UIType.IssueLink: {
                const selectField = field as SelectFieldUI;

                let validateFunc = (field.required) ? FieldValidators.validateSingleSelect : undefined;
                return (
                    <React.Fragment>
                        <Field label={field.name}
                            isRequired={field.required}
                            id={`${field.key}.type`}
                            name={`${field.key}.type`}
                            validate={validateFunc}>
                            {
                                (fieldArgs: any) => {
                                    let errDiv = <span />;
                                    if (fieldArgs.error === 'EMPTY') {
                                        errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                                    }

                                    return (
                                        <div>
                                            <Select
                                                {...fieldArgs.fieldProps}
                                                isMulti={false}
                                                isClearable={!field.required && selectField.isMulti}
                                                className="ac-select-container"
                                                classNamePrefix="ac-select"
                                                getOptionLabel={(option: any) => (option.name) ? option.name : option.value}
                                                getOptionValue={(option: any) => (option.name) ? option.name : option.value}
                                                placeholder="Select link type"
                                                options={this.state.fieldOptions[field.key]}
                                                components={(selectField.allowedValues && selectField.allowedValues.length > 0 && selectField.allowedValues[0].iconUrl) ? { Option: IconOption, SingleValue: IconValue } : {}}
                                            />
                                            {errDiv}
                                        </div>
                                    );
                                }
                            }
                        </Field>
                        <Field
                            id={`${field.key}.issue`}
                            name={`${field.key}.issue`}>
                            {
                                (fieldArgs: any) => {
                                    return (
                                        <AsyncCreatableSelect
                                            {...fieldArgs.fieldProps}
                                            isMulti={selectField.isMulti}
                                            isClearable={!field.required && selectField.isMulti}
                                            className="ac-select-container"
                                            classNamePrefix="ac-select"
                                            loadOptions={this.loadIssueOptions}
                                            getOptionLabel={(option: any) => option.key}
                                            getOptionValue={(option: any) => option.key}
                                            placeholder="Search for an issue"


                                            onCreateOption={(input: any): void => { this.handleOptionCreate(input, field.key); }}
                                            onChange={chain(fieldArgs.fieldProps.onChange, (selected: any) => { this.handleSelectChange(selected, field.key); })}

                                            isLoading={this.state.loadingField === field.key}
                                            isDisabled={this.state.isSomethingLoading}
                                            formatCreateLabel={(input: any) => { return `${input} (Enter issue key)`; }}
                                            components={{ Option: IssueSuggestionOption, MultiValueLabel: IssueSuggestionValue }}

                                            isValidNewOption={(inputValue: any, selectValue: any, selectOptions: any[]) => {
                                                if (inputValue.trim().length === 0 || selectOptions.find(option => option.name === inputValue)) {
                                                    return false;
                                                }
                                                return true;
                                            }}
                                            getNewOptionData={(inputValue: any, optionLabel: any) => ({
                                                key: inputValue,
                                                summaryText: optionLabel
                                            })}
                                        />
                                    );
                                }
                            }
                        </Field>

                    </React.Fragment>
                );
            }
            case UIType.Timetracking: {
                let validateFunc = field.required ? FieldValidators.validateString : undefined;
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
            case UIType.Attachment:
                return (
                    <Field label='Add attachment' name='attachment'>
                        {
                            // Not using fieldArgs here as we handle attachments separately
                            () =>
                                <div className='ac-vpadding'>
                                    <input
                                        multiple
                                        type="file"
                                        id="attachment" name="attachment"
                                        ref={(ref) => this.fileUpload = ref} />
                                </div>
                        }
                    </Field>
                );
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

    createableSelect(field: SelectFieldUI): any {
        let validateFunc = undefined;
        if (field.required) {
            validateFunc = (field.isMulti) ? FieldValidators.validateMultiSelect : FieldValidators.validateSingleSelect;
        }

        if (field.key === 'labels' || field.autoCompleteUrl.includes('/rest/api/1.0/labels/suggest')) {
            return (
                <Field label={field.name}
                    isRequired={field.required}
                    id={field.key}
                    name={field.key}
                    validate={validateFunc}
                    defaultValue={[]}
                >
                    {
                        (fieldArgs: any) => {
                            let errDiv = <span />;
                            if (fieldArgs.error === 'EMPTY') {
                                errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                            }

                            return (
                                <div>
                                    <AsyncCreatableSelect
                                        {...fieldArgs.fieldProps}
                                        loadOptions={this.loadLabelOptions}
                                        isMulti={field.isMulti}
                                        isClearable={!field.required && field.isMulti}
                                        className="ac-select-container"
                                        classNamePrefix="ac-select"
                                        getOptionLabel={(option: any) => option}
                                        getOptionValue={(option: any) => option}
                                        isLoading={this.state.loadingField === field.key}
                                        isDisabled={this.state.isSomethingLoading}
                                        isValidNewOption={(inputValue: any, selectValue: any, selectOptions: any[]) => {
                                            if (inputValue.trim().length === 0 || selectOptions.find(option => option === inputValue)) {
                                                return false;
                                            }
                                            return true;
                                        }
                                        }
                                        getNewOptionData={(inputValue: any, optionLabel: any) => (inputValue)}
                                    >
                                    </AsyncCreatableSelect>
                                    {errDiv}
                                </div>
                            );
                        }
                    }
                </Field>
            );
        }

        return (
            <Field label={field.name}
                isRequired={field.required}
                id={field.key}
                name={field.key}
                validate={validateFunc}
                defaultValue={this.state.fieldValues[field.key]}
            >
                {
                    (fieldArgs: any) => {
                        let errDiv = <span />;
                        if (fieldArgs.error === 'EMPTY') {
                            errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                        }

                        return (
                            <div>
                                <CreatableSelect
                                    {...fieldArgs.fieldProps}
                                    isMulti={field.isMulti}
                                    isClearable={!field.required && field.isMulti}
                                    className="ac-select-container"
                                    classNamePrefix="ac-select"
                                    getOptionLabel={(option: any) => option.name}
                                    getOptionValue={(option: any) => option.id}
                                    options={this.state.fieldOptions[field.key]}
                                    onCreateOption={(input: any): void => { this.handleOptionCreate(input, field.key); }}
                                    onChange={chain(fieldArgs.fieldProps.onChange, (selected: any) => { this.handleSelectChange(selected, field.key); })}

                                    isLoading={this.state.loadingField === field.key}
                                    isDisabled={this.state.isSomethingLoading}
                                    isValidNewOption={(inputValue: any, selectValue: any, selectOptions: any[]) => {
                                        if (inputValue.trim().length === 0 || selectOptions.find(option => option.name === inputValue)) {
                                            return false;
                                        }
                                        return true;
                                    }}
                                    getNewOptionData={(inputValue: any, optionLabel: any) => ({
                                        id: inputValue,
                                        name: optionLabel,
                                    })}
                                >
                                </CreatableSelect>
                                {errDiv}
                            </div>
                        );
                    }
                }
            </Field>
        );
    }
}
