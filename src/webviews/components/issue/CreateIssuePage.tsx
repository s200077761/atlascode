import * as React from 'react';
import { Action, HostErrorMessage } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreateIssueData, ProjectList, CreatedSomething, isCreatedSomething, isIssueCreated, LabelList, UserList } from '../../../ipc/issueMessaging';
import { emptyWorkingProject, WorkingProject } from '../../../config/model';
import { FetchQueryAction, ScreensForProjectsAction, CreateSomethingAction, CreateIssueAction, OpenIssueByKeyAction, FetchUsersQueryAction } from '../../../ipc/issueActions';
import Form, { Field, Fieldset, FormFooter, ErrorMessage, CheckboxField } from '@atlaskit/form';
import Select, { AsyncCreatableSelect,  AsyncSelect, CreatableSelect, components } from '@atlaskit/select';
import { RadioGroup } from '@atlaskit/radio';
import { Checkbox } from '@atlaskit/checkbox';
import Button from '@atlaskit/button';
import Banner from '@atlaskit/banner';
import { DatePicker, DateTimePicker } from '@atlaskit/datetime-picker';
import Avatar from '@atlaskit/avatar';
import Panel from '@atlaskit/panel';
import Page, { Grid, GridColumn } from "@atlaskit/page";
import { SelectScreenField, ScreenField, UIType, InputScreenField, InputValueType, OptionableScreenField } from '../../../jira/createIssueMeta';
import { FieldValidators } from '../fieldValidators';

type Emit = FetchQueryAction | FetchUsersQueryAction | ScreensForProjectsAction | CreateSomethingAction | CreateIssueAction | OpenIssueByKeyAction | Action;
type Accept = CreateIssueData | ProjectList | CreatedSomething | LabelList | UserList | HostErrorMessage;
type IssueType = { id:string, name:string, iconUrl:string };

interface ViewState extends CreateIssueData {
    isSomethingLoading:boolean;
    loadingField:string;
    fieldOptions:{[k:string]:any};
    isCreateBannerOpen:boolean;
    isErrorBannerOpen:boolean;
    errorDetails:any;
    createdIssue:any;
    defaultIssueType:any;
    fieldValues:{[k:string]:any};
}
const emptyState:ViewState = {
    type:'',
    selectedProject:emptyWorkingProject,
    availableProjects:[],
    selectedIssueTypeId:'',
    defaultIssueType:{},
    issueTypeScreens:{},
    fieldValues:{},
    fieldOptions:{},
    isSomethingLoading:false,
    loadingField:'',
    isCreateBannerOpen:false,
    isErrorBannerOpen:false,
    errorDetails:undefined,
    createdIssue:{}
};

// Used to render custom select options with icons
const { Option } = components;
const IconOption = (props:any) => (
    <Option {...props}>
      <span><img src={props.data.iconUrl} width="16" height="16"/>{props.label}</span>
    </Option>
);

const IconValue = (props:any) => (
      <components.SingleValue {...props}>
        <span><img src={props.data.iconUrl} width="16" height="16"/>{props.data.name}</span>
      </components.SingleValue>

  );

const UserOption = (props:any) => {
    let avatar = (props.data.avatarUrls && props.data.avatarUrls['24x24']) ? props.data.avatarUrls['24x24'] : '';
    return (
    <Option {...props}>
      <div ref={props.innerRef} {...props.innerProps} style={{display:'flex', 'align-items':'center'}}><Avatar size='medium' borderColor='var(--vscode-dropdown-foreground)!important' src={avatar} /><span style={{marginLeft:'4px'}}>{props.data.name} ({props.data.displayName})</span></div>
    </Option>
    );
};

const UserValue = (props:any) => {
    let avatar = (props.data.avatarUrls && props.data.avatarUrls['24x24']) ? props.data.avatarUrls['24x24'] : '';
    return (
        <components.SingleValue {...props}>
        <div ref={props.innerRef} {...props.innerProps} style={{display:'flex', 'align-items':'center'}}><Avatar size='small'  borderColor='var(--vscode-dropdown-foreground)!important' src={avatar} /><span style={{marginLeft:'4px'}}>{props.data.name} ({props.data.displayName})</span></div>
        </components.SingleValue>
    );
};

// used to chain onChange function so we can provide custom functionality after internal state changes
const chain = (...fns:any[]) => (...args:any[]) => fns.forEach(fn => fn(...args));

export default class CreateIssuePage extends WebviewComponent<Emit, Accept, {},ViewState> {
    private newProjects:WorkingProject[] = [];
    private issueTypes:any[] = [];
    private labelSuggestions:string[] | undefined = undefined;
    private userSuggestions:any[] | undefined = undefined;
    private newOption:any;

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    refreshSelectFields(issueTypeId:string|undefined, issueData:CreateIssueData):Object {
        let fieldOptions = {};
        if(issueTypeId) {
            let selectFields = issueData.issueTypeScreens[issueTypeId].fields.filter(field => {return field.uiType === UIType.Select;});

            selectFields.forEach(field => {
                fieldOptions[field.key] = this.getSelectOptions(issueTypeId,field.key,issueData);
            });
        }
        return fieldOptions;
    }

    getSelectOptions(issueTypeId:string|undefined, fieldKey:string, issueData:CreateIssueData):any[] {
        let opts:any[] = new Array();

        if(issueTypeId) {
            const field:SelectScreenField | undefined = issueData.issueTypeScreens[issueTypeId].fields.find(field => field.key === fieldKey) as SelectScreenField | undefined;
            if(field && field.allowedValues && field.allowedValues.length > 0) {
                switch(fieldKey) {
                    case 'fixVersions':
                    case 'versions': {
                        let unreleasedOpts = field.allowedValues.filter(opt => {return !opt.released && !opt.archived;});
                        let releasedOpts = field.allowedValues.filter(opt => {return opt.released && !opt.archived;});

                        opts = [
                            {label:'Unreleased Versions', options:unreleasedOpts}
                            ,{label:'Released Versions', options:releasedOpts}
                        ];
                        break;
                    }

                    default: {
                        field.allowedValues.forEach(opt => {opts.push(opt);});
                        break;
                    }
                }
            }
        }
        
        return opts;
    }

    componentDidMount() {
        this.postMessage({action:'refresh'});
    }

    onMessageReceived(e:any): void {
        switch (e.type) {
            case 'error': {
                this.setState({isSomethingLoading:false, loadingField:'', isErrorBannerOpen:true, errorDetails:e.reason});

                break;
            }
            case 'screenRefresh': {
                const issueData = e as CreateIssueData;
                this.issueTypes = Object.entries(issueData.issueTypeScreens).map(([key, value]) => { return { id:value.id, name:value.name, iconUrl:value.iconUrl }; });

                const selectedType = this.issueTypes.find(it => it.id === issueData.selectedIssueTypeId);
                this.setState({...issueData, ...{isSomethingLoading:false, loadingField:'', defaultIssueType:selectedType, fieldOptions:this.refreshSelectFields(issueData.selectedIssueTypeId,issueData)}});
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
            case 'optionCreated': {
                if(isCreatedSomething(e)){
                    this.newOption = e.createdData;
                }
                break;
            }
            case 'issueCreated': {
                if(isIssueCreated(e)){
                    this.setState({isSomethingLoading:false, loadingField:'', isCreateBannerOpen:true, createdIssue:e.issueData, fieldValues:{...this.state.fieldValues,...{description:'',summary:''}}});
                    setTimeout(()=>{
                        this.setState({isCreateBannerOpen:false});
                    },6000);
                }
                break;
            }
            default: {
                break;
            }
        }
    }

    loadProjectOptions = (input:string):Promise<any> => {
        return new Promise(resolve => {
            this.newProjects = [];
            this.postMessage({action:'fetchProjects', query:input});
            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if(this.newProjects.length > 0 || (end - start) > 2000) {
                    clearInterval(timer);
                    resolve(this.newProjects);
                }
            }, 100);
        });
    }

    handleProjectChange = (selected:WorkingProject):void => {
        this.state = emptyState;
        this.setState({...emptyState, ...{isSomethingLoading:true, loadingField:'' }});
        this.postMessage({action:'getScreensForProject', project:selected});
    }

    handleIssueTypeChange = (newType:IssueType, prevType:IssueType):IssueType => {
        this.setState((oldState, props) => {
           return {
                selectedIssueTypeId:newType.id,
                fieldOptions:this.refreshSelectFields(newType.id,oldState)
            };
        });

        return newType;
    }

    handleSelectChange = (selected:any, fieldKey:string):void => {
        this.state.fieldValues[fieldKey] = selected;
    }

    handleOptionCreate = (input:any, fieldKey:string):void => {
        this.newOption = undefined;
        this.setState({isSomethingLoading:true, loadingField:fieldKey});
        this.postMessage({action:'createOption', createData:{fieldKey:fieldKey,name:input,project:this.state.selectedProject.key}});

        const start = Date.now();
        let timer = setInterval(() => {
            const end = Date.now();
            if(this.newOption && this.newOption.id.length > 0) {
                clearInterval(timer);
                this.setState((oldState, props) => {
                    
                    if(!oldState.fieldValues[fieldKey]) {
                        oldState.fieldValues[fieldKey] = [];
                    }

                    if(!oldState.fieldOptions[fieldKey]) {
                        oldState.fieldOptions[fieldKey] = [];
                    }

                    let newOptions = oldState.fieldOptions[fieldKey];

                    if(fieldKey === 'versions' || fieldKey === 'fixVersions') {
                        newOptions[0].options.push(this.newOption);
                    } else {
                        newOptions.push(this.newOption);
                    }
                    return {
                        isSomethingLoading:false, 
                        loadingField:'',
                        fieldValues:{...oldState.fieldValues, ...{[fieldKey]:[...oldState.fieldValues[fieldKey],...[this.newOption]]}},
                        fieldOptions:{...oldState.fieldOptions, ...{[fieldKey]:newOptions}}
                    };
                });
            } else if((end - start) > 2000) {
                clearInterval(timer); 
                this.setState({isSomethingLoading:false, loadingField:''});
            }
        }, 100);
    }

    loadLabelOptions = (input:string):Promise<any> => {
        return new Promise(resolve => {
            this.labelSuggestions = undefined;
            this.postMessage({action:'fetchLabels', query:input});

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if(this.labelSuggestions !== undefined || (end - start) > 2000) {
                    if(this.labelSuggestions === undefined) {
                        this.labelSuggestions = [];
                    }

                    clearInterval(timer);
                    this.setState({isSomethingLoading:false, loadingField:'' });
                    resolve(this.labelSuggestions);
                }
            }, 100);
        });
    }

    loadUserOptions = (input:string):Promise<any> => {
        return new Promise(resolve => {
            this.userSuggestions = undefined;
            this.postMessage({action:'fetchUsers', query:input, project:this.state.selectedProject.key});

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if(this.userSuggestions !== undefined || (end - start) > 2000) {
                    if(this.userSuggestions === undefined) {
                        this.userSuggestions = [];
                    }

                    clearInterval(timer);
                    this.setState({isSomethingLoading:false, loadingField:'' });
                    resolve(this.userSuggestions);
                }
            }, 100);
        });
    }

    handleSubmit = (e:any) => {
        let requiredFields = this.state.issueTypeScreens[this.state.selectedIssueTypeId!].fields.filter(field => {return field.required;});
        let errs = {};
        requiredFields.forEach((field:ScreenField) => {
            if(e[field.key] === undefined || (e[field.key].length < 1)){
                errs[field.key] = 'EMPTY';
            }
        });

        
        if(Object.keys(errs).length > 0) {
            return errs;
        }

        this.postMessage({action:'createIssue', issueData:e});

        return undefined;
    }

    public render() {
        let renderableFields: any[] = [];
        let advancedFields: any[] = [];

        if(this.state.selectedIssueTypeId && this.state.selectedIssueTypeId !== '') {
            
            const screen = this.state.issueTypeScreens[this.state.selectedIssueTypeId];
            if(screen && screen.fields && screen.fields.length > 0) {
                renderableFields = [];
                advancedFields = [];
                screen.fields.forEach(field => {
                    (field.advanced) ? advancedFields.push(this.getFieldMarkup(field)) : renderableFields.push(this.getFieldMarkup(field));
                    
                });
            }
        } else {
            return (<div>waiting for data...</div>);
        }

        return (
            <Page>
                <Grid>
                    <GridColumn medium={8}>
                        <div>
                            <Banner isOpen={this.state.isCreateBannerOpen} appearance="announcement">
                                Issue <Button appearance='link' onClick={() => this.postMessage({action:'openJiraIssueByKey',key:this.state.createdIssue.key})}>{this.state.createdIssue.key}</Button> has been created.
                            </Banner>
                            <Banner isOpen={this.state.isErrorBannerOpen} appearance="error">
                                Error: <div><pre>{JSON.stringify(this.state.errorDetails,undefined,4)}</pre></div>
                                
                                <div><Button appearance='link' onClick={() => this.setState({isErrorBannerOpen:false, errorDetails:undefined})}>close</Button></div>
                            </Banner>
                            <h2>Create Issue</h2>
                            <Form
                                name="create-issue"
                                onSubmit={this.handleSubmit}
                                >
                                    {(frmArgs:any) => {
                                        return(<form {...frmArgs.formProps}>
                                        <Field  defaultValue={this.state.selectedProject} 
                                                label='Project'
                                                isRequired={true}
                                                id='project'
                                                name='project'
                                                validate={FieldValidators.validateSingleSelect}>
                                        {
                                            (fieldArgs:any) => {
                                                let errDiv = <span/>;
                                                if(fieldArgs.error === 'EMPTY'){
                                                    errDiv = <ErrorMessage>Project is required</ErrorMessage>;
                                                }
                                                return (
                                                    <div>
                                                        <AsyncSelect
                                                            {...fieldArgs.fieldProps}
                                                            className="ak-select-container"
                                                            classNamePrefix="ak-select"
                                                            getOptionLabel={(option:WorkingProject) => {
                                                                return option.name;
                                                            }}
                                                            getOptionValue={(option:WorkingProject) => {
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
                                        
                                        <Field  defaultValue={this.state.defaultIssueType} 
                                                label='Issue Type'
                                                isRequired={true}
                                                id='issuetype'
                                                name='issuetype'
                                                validate={FieldValidators.validateSingleSelect}>
                                        {
                                            (fieldArgs:any) => {
                                                let errDiv = <span/>;
                                                if(fieldArgs.error === 'EMPTY'){
                                                    errDiv = <ErrorMessage>Issue Type is required</ErrorMessage>;
                                                }
                                                return (
                                                    <div>
                                                        <Select
                                                        {...fieldArgs.fieldProps}
                                                        className="ak-select-container"
                                                        classNamePrefix="ak-select"
                                                        options={this.issueTypes}
                                                        placeholder="Select Issue Type"
                                                        components={{ Option: IconOption, SingleValue:IconValue }}
                                                        getOptionLabel={(option:any) => option.name}
                                                        getOptionValue={(option:any) => option.id}
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
                                            <Button type="submit" className='ak-button' isDisabled={this.state.isSomethingLoading} isLoading={this.state.loadingField === 'submitButton'}>
                                            Submit
                                            </Button>
                                        </FormFooter>
                                        </form>);
                                    }}
                            </Form>
                        </div>
                    </GridColumn>
                </Grid>
            </Page>
        );
    }

    getFieldMarkup(field:ScreenField):any {
        switch(field.uiType) {
            case UIType.Textarea: {
                let validateFunc = field.required ? FieldValidators.validateString : undefined;
                return (
                    <Field label={field.name} isRequired={field.required} id={field.key} name={field.key} validate={validateFunc}>
                    {
                        ( fieldArgs:any) => {
                            let errDiv = <span/>;
                            if(fieldArgs.error === 'EMPTY'){
                                errDiv = 
                                <ErrorMessage>
                                {field.name} is required
                                </ErrorMessage>;
                            }
                            return (
                                <div>
                                <textarea {...fieldArgs.fieldProps}
                                    style={{width:'100%', display:'block'}}
                                    className='ak-textarea'
                                    rows={3}
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
                let valType = (field as InputScreenField).valueType;
                switch(valType) {
                    case InputValueType.Number: {
                        validateFunc = (value:any, state:any) => {
                            if(field.required){
                                return FieldValidators.validateRequiredNumber(value,state);
                            }
                            
                            return FieldValidators.validateNumber(value,state);
                        };

                        break;
                    }
                    case InputValueType.Url: {
                        validateFunc = (field.required) ? FieldValidators.validateRequiredUrl : FieldValidators.validateUrl;
                        break;
                    }
                    default: {
                        if(field.required) {
                            validateFunc = FieldValidators.validateString;
                            break;
                        }
                        break;
                    }
                }

                return (
                    <Field label={field.name} isRequired={field.required} id={field.key} name={field.key} validate={validateFunc}>
                    {
                        ( fieldArgs:any) => {
                            let errDiv = <span/>;
                            if(fieldArgs.error === 'EMPTY'){
                                errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                            } else if(fieldArgs.error === 'NOT_NUMBER'){
                                errDiv = <ErrorMessage>{field.name} must be a number</ErrorMessage>;
                            } else if(fieldArgs.error === 'NOT_URL'){
                                errDiv = <ErrorMessage>{field.name} must be a url</ErrorMessage>;
                            }
                            return (
                                <div>
                                <input {...fieldArgs.fieldProps} style={{width:'100%', display:'block'}} className='ak-inputField' disabled={this.state.isSomethingLoading} />
                                {errDiv}
                                </div>
                            );
                        }
                    }
                    </Field>
                );
            }
            case UIType.Checkbox: {
                let checkboxItems:any[] = [];
                const checkField = field as OptionableScreenField;
                checkField.allowedValues.forEach(value => {
                    checkboxItems.push(
                        <CheckboxField name={field.key} id={field.key} value={value.id} isRequired={field.required}>
                        {
                            ( fieldArgs:any) => {
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
                let radioItems:any[] = [];
                const radioField = field as OptionableScreenField;
                radioField.allowedValues.forEach(value => {
                    radioItems.push({name:field.key, label:value.value, value:value.id});
                });

                let validateFunc = field.required ? FieldValidators.validateMultiSelect : undefined;
                return (
                    <Field label={field.name} isRequired={field.required} id={field.key} name={field.key} validate={validateFunc}>
                    {
                        ( fieldArgs:any) => {
                            return ( <RadioGroup {...fieldArgs.fieldProps} options={radioItems} />);
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
                        ( fieldArgs:any) => {
                            let errDiv = <span/>;
                            if(fieldArgs.error === 'EMPTY'){
                                errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                            }
                            return (
                                <div>
                                 <DatePicker 
                                    {...fieldArgs.fieldProps}
                                    className="ak-select-container"
                                    selectProps={{className:"ak-select-container", classNamePrefix:"ak-select"}}
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
                        ( fieldArgs:any) => {
                            let errDiv = <span/>;
                            if(fieldArgs.error === 'EMPTY'){
                                errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                            }
                            return (
                                <div>
                                 <DateTimePicker 
                                    {...fieldArgs.fieldProps}
                                    className="ak-select-container"
                                    datePickerSelectProps={{className:"ak-select-container", classNamePrefix:"ak-select"}}
                                    timePickerSelectProps={{className:"ak-select-container", classNamePrefix:"ak-select"}}
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
                const selectField = field as SelectScreenField;
                return (
                     <Field label={field.name}
                            isRequired={field.required} 
                            id={field.key} 
                            name={field.key}
                            validate={validateFunc}>
                    {
                        (fieldArgs:any) => {
                            let errDiv = <span/>;
                            if(fieldArgs.error === 'EMPTY'){
                                errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                            }

                            return(
                                <div>
                                    <AsyncSelect
                                        {...fieldArgs.fieldProps}
                                        className="ak-select-container"
                                        classNamePrefix="ak-select"
                                        loadOptions={this.loadUserOptions}
                                        getOptionLabel={(option:any) => option.name}
                                        getOptionValue={(option:any) => option.accountId}
                                        placeholder="Search for a User"
                                        isLoading={this.state.loadingField === field.key}
                                        isDisabled={this.state.isSomethingLoading}
                                        isMulti={selectField.isMulti}
                                        components={{ Option: UserOption, SingleValue:UserValue }}
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
                const selectField = field as SelectScreenField;
                if(selectField.isCreateable) {
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
                        (fieldArgs:any) => {
                            let errDiv = <span/>;
                            if(fieldArgs.error === 'EMPTY'){
                                errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                            }

                            return(
                                <div>
                                <Select
                                    {...fieldArgs.fieldProps}
                                    isMulti={selectField.isMulti}
                                    isClearable={!field.required && selectField.isMulti}
                                    className="ak-select-container"
                                    classNamePrefix="ak-select"
                                    getOptionLabel={(option:any) => (option.name) ? option.name : option.value}
                                    getOptionValue={(option:any) => option.id}
                                    options={this.state.fieldOptions[field.key]}
                                    components={(selectField.allowedValues.length > 0 && selectField.allowedValues[0].iconUrl)? { Option: IconOption, SingleValue:IconValue }: {}}
                                />
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
                ( fieldArgs:any) => {
                    let errDiv = <span/>;
                    if(fieldArgs.error === 'EMPTY'){
                        errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                    }
                    return (
                        <div>
                        <input {...fieldArgs.fieldProps} style={{width:'100%', display:'block'}} className='ak-inputField' />
                        {errDiv}
                        </div>
                    );
                }
            }
            </Field>
        );
    }

    createableSelect(field:SelectScreenField):any {
        let validateFunc = undefined;
        if(field.required){
            validateFunc = (field.isMulti) ? FieldValidators.validateMultiSelect : FieldValidators.validateSingleSelect;
        }

        if(field.key === 'labels' || field.autoCompleteUrl.includes('/rest/api/1.0/labels/suggest')) {
            return (
                <Field label={field.name}
                        isRequired={field.required} 
                        id={field.key} 
                        name={field.key}
                        validate={validateFunc}
                        defaultValue={[]}
                        >
                {
                    (fieldArgs:any) => {
                        let errDiv = <span/>;
                        if(fieldArgs.error === 'EMPTY'){
                            errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                        }

                        return(
                            <div>
                                <AsyncCreatableSelect
                                    {...fieldArgs.fieldProps}
                                    loadOptions={this.loadLabelOptions}
                                    isMulti={field.isMulti}
                                    isClearable={!field.required && field.isMulti}
                                    className="ak-select-container"
                                    classNamePrefix="ak-select"
                                    getOptionLabel={(option:any) => option}
                                    getOptionValue={(option:any) => option}
                                    isLoading={this.state.loadingField === field.key}
                                    isDisabled={this.state.isSomethingLoading}
                                    isValidNewOption = {(inputValue:any, selectValue:any, selectOptions:any[]) => {
                                            if (inputValue.trim().length === 0 || selectOptions.find(option => option === inputValue)) {
                                                return false;
                                            }
                                            return true;
                                        }
                                    }
                                    getNewOptionData={(inputValue:any, optionLabel:any) => (inputValue)}
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

        return(
            <Field label={field.name}
                    isRequired={field.required} 
                    id={field.key} 
                    name={field.key}
                    validate={validateFunc}
                    defaultValue={this.state.fieldValues[field.key]}
            >
                {
                    (fieldArgs:any) => {
                        let errDiv = <span/>;
                        if(fieldArgs.error === 'EMPTY'){
                            errDiv = <ErrorMessage>{field.name} is required</ErrorMessage>;
                        }
                        
                        return(
                            <div>
                                <CreatableSelect
                                    {...fieldArgs.fieldProps}
                                    isMulti={field.isMulti}
                                    isClearable={!field.required && field.isMulti}
                                    className="ak-select-container"
                                    classNamePrefix="ak-select"
                                    getOptionLabel={(option:any) => option.name}
                                    getOptionValue={(option:any) => option.id}
                                    options={this.state.fieldOptions[field.key]}
                                    onCreateOption={(input:any):void => {this.handleOptionCreate(input,field.key);}}
                                    onChange={chain(fieldArgs.fieldProps.onChange, (selected:any) => {this.handleSelectChange(selected,field.key);})}

                                    isLoading={this.state.loadingField === field.key}
                                    isDisabled={this.state.isSomethingLoading}
                                    isValidNewOption = {(inputValue:any, selectValue:any, selectOptions:any[]) => {
                                        if (inputValue.trim().length === 0 || selectOptions.find(option => option.name === inputValue)) {
                                            return false;
                                        }
                                        return true;
                                    }}
                                    getNewOptionData={(inputValue:any, optionLabel:any) => ({
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
