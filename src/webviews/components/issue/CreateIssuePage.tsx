import * as React from 'react';
import { Action } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreateIssueData, ProjectList, CreatedSomething, isCreatedSomething, isIssueCreated, LabelList } from '../../../ipc/issueMessaging';
import JiraProjectSelect from '../JiraProjectSelect';
import { emptyWorkingProject, WorkingProject } from '../../../config/model';
import { FetchQueryAction, ScreensForProjectsAction, CreateSomethingAction, CreateIssueAction, OpenIssueAction } from '../../../ipc/issueActions';
import Form, { Field, FormFooter } from '@atlaskit/form';
import Select, { CreatableSelect, AsyncCreatableSelect, components } from '@atlaskit/select';
import Button from '@atlaskit/button';
import Banner from '@atlaskit/banner';
import { DateTimePicker, DatePicker } from '@atlaskit/datetime-picker';

import Page, { Grid, GridColumn } from "@atlaskit/page";
import { SelectScreenField, ScreenField, UIType, OptionableScreenField } from '../../../jira/createIssueMeta';

type Emit = FetchQueryAction | ScreensForProjectsAction | CreateSomethingAction | CreateIssueAction | OpenIssueAction | Action;
type Accept = CreateIssueData | ProjectList | CreatedSomething | LabelList;
type IssueType = { id:string, name:string, iconUrl:string };

interface ViewState extends CreateIssueData {
    isSomethingLoading:boolean;
    loadingField:string;
    fieldOptions:{[k:string]:any};
    isBannerOpen:boolean;
    createdIssue:any;
}
const emptyState:ViewState = {
    type:'',
    selectedProject:emptyWorkingProject,
    availableProjects:[],
    selectedIssueType:{},
    issueTypeScreens:{},
    fieldValues:{},
    fieldOptions:{},
    isSomethingLoading:false,
    loadingField:'',
    isBannerOpen:false,
    createdIssue:{}
};

const { Option } = components;

const IconOption = (props:any) => (
    <Option {...props}>
      <span><img src={props.data.iconUrl} width="16" height="16"/>{props.label}</span>
    </Option>
);

const ValueComponent = (props:any) => (
      <components.SingleValue {...props}>
        <span><img src={props.data.iconUrl} width="16" height="16"/>{props.data.name}</span>
      </components.SingleValue>

  );

export default class CreateIssuePage extends WebviewComponent<Emit, Accept, {},ViewState> {
    private newProjects:WorkingProject[] = [];
    private labelSuggestions:string[] | undefined = undefined;
    private newOption:any;

    private formRef:any;

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
        let opts:any[] = [];

        if(issueTypeId) {
            console.log('looking for screen',issueTypeId);
            const field:SelectScreenField | undefined = issueData.issueTypeScreens[issueTypeId].fields.find(field => field.key === fieldKey) as SelectScreenField | undefined;
            console.log('field is',field);
            if(field && field.allowedValues) {
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

    onMessageReceived(e:Accept): void {
        switch (e.type) {
            case 'screenRefresh': {
                const issueData = e as CreateIssueData;
                this.setState({...issueData, ...{fieldOptions:this.refreshSelectFields(issueData.selectedIssueType.id,issueData)}});
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
            case 'optionCreated': {
                if(isCreatedSomething(e)){
                    this.newOption = e.createdData;
                }
                break;
            }
            case 'issueCreated': {
                if(isIssueCreated(e)){
                    this.setState({isSomethingLoading:false, loadingField:'', isBannerOpen:true, createdIssue:e.issueData, fieldValues:{...this.state.fieldValues,...{description:'',summary:''}}});
                    setTimeout(()=>{
                        this.setState({isBannerOpen:false});
                    },6000);
                }
                break;
            }
            default: {
                break;
            }
        }
    }

    handleProjectInput = (input:string):Promise<any> => {
        return new Promise(resolve => {
            this.newProjects = [];
            this.postMessage({action:'fetchProjects', query:input});
            let timer = setInterval(() => {
                if(this.newProjects.length > 0) {
                    clearInterval(timer);
                    resolve(this.newProjects);
                }
            }, 500);
        });
    }

    onProjectSelected = (selected:WorkingProject):void => {
        this.postMessage({action:'getScreensForProject', project:selected});
    }

    onIssueTypeSelected = (selected:IssueType):void => {
        // TODO: try to clear field values
        console.log('selected type',selected);
        this.setState({
            selectedIssueType:selected,
            fieldOptions:this.refreshSelectFields(selected.id,this.state)
        });

        console.log('field values',this.state.fieldValues);
    }

    handleOptionCreate = (input:any, fieldKey:string):void => {
        this.newOption = undefined;
        this.setState({isSomethingLoading:true, loadingField:fieldKey});
        this.postMessage({action:'createOption', createData:{fieldKey:fieldKey,name:input,project:this.state.selectedProject.key}});
        let timer = setInterval(() => {
            if(this.newOption && this.newOption.id.length > 0) {
                clearInterval(timer);
                let newVals = this.state.fieldValues[fieldKey];
                if(!newVals) {
                    newVals = [];
                }
                newVals.push(this.newOption);
                console.log('old option state', this.state.fieldOptions[fieldKey]);

                let newOptions = {...this.state.fieldOptions, ...{[fieldKey]:[...this.state.fieldOptions[fieldKey],...[this.newOption]]}};

                if(fieldKey === 'versions' || fieldKey === 'fixVersions') {
                    let vOptions = this.state.fieldOptions[fieldKey];
                    vOptions[0].options.push(this.newOption);

                    newOptions = {...this.state.fieldOptions, ...{[fieldKey]:vOptions}};
                }
                
                console.log('new option state', newOptions);
                this.setState(
                    {isSomethingLoading:false, 
                        loadingField:'', 
                        fieldValues:{...this.state.fieldValues,...{[fieldKey]:newVals}}, 
                        fieldOptions:newOptions
                    });
                    
            } else {
                this.setState({isSomethingLoading:false, loadingField:''});
            }
        }, 500);
    }

    loadLabelOptions = (input:string):Promise<any> => {
        return new Promise(resolve => {
            this.labelSuggestions = undefined;
            this.postMessage({action:'fetchLabels', query:input});
            let timer = setInterval(() => {
                if(this.labelSuggestions !== undefined) {
                    clearInterval(timer);
                    resolve(this.labelSuggestions);
                }
            }, 500);
        });
    }

    handleLabelCreate = (input:any, fieldKey:string):void => {
        let newVals = this.state.fieldValues[fieldKey];
        if(!newVals) {
            newVals = [];
        }
        newVals.push(input);
        this.setState(
            {isSomethingLoading:false, 
                loadingField:'', 
                fieldValues:{...this.state.fieldValues,...{[fieldKey]:newVals}}, 
                fieldOptions:{...this.state.fieldOptions, ...{[fieldKey]:[...this.state.fieldOptions[fieldKey],...[input]]}}
            });
    }

    handleSubmit = (e?:any):void => {
        console.log('onSubmitHandler', e);
        // Calling validate on the form will update it's fields state
        const validateResult = this.formRef.validate();
        console.log('validate result',validateResult);
        if (validateResult.isInvalid) {
          console.log('onSubmitHandler = Form Fields Invalid');
        } else {
            this.setState({isSomethingLoading:true,loadingField:'submitButton'});
          // Now call submit when your done
          this.postMessage({action:'createIssue',issueData:{fields:{...this.state.fieldValues,...{project:{id:this.state.selectedProject.id},issuetype:{id:this.state.selectedIssueType.id}}}}});
          console.log('valid submit',this.formRef);
        }
    }

    setTextFieldValue = (item: any) => {
        console.log('setFieldValue',item);
        let val = {};
        val[item.target.id] = item.target.value;
        const newObj = {...this.state.fieldValues, ...val};
        console.log('set new field value',item.target.id, newObj);
        this.setState({fieldValues:newObj});
    }

    setCheckboxValue = (item: any) => {
        console.log('setCheckboxValue',item.target.id);

        let newVals:any[] = this.state.fieldValues[item.target.id];
        if(!newVals) {
            newVals = [];
        }

        if(item.target.checked) {
            newVals.push(item.target.value);
        } else if(newVals.includes(item.target.value)) {
            let i = newVals.indexOf(item.target.value);
            newVals.splice(i,1);
        }
        
        this.setState(
            {fieldValues:{...this.state.fieldValues,...{[item.target.id]:newVals}}});
    }
    
    public render() {
        let renderableFields: any[] = [];

        if(this.state.selectedIssueType.id) {
            
            const screen = this.state.issueTypeScreens[this.state.selectedIssueType.id];
            if(screen) {
                screen.fields.forEach(field => {
                    renderableFields.push(this.getFieldMarkup(field));
                });
            }
        }
        
        const issueTypes = Object.entries(this.state.issueTypeScreens).map(([key, value]) => { return { id:value.id, name:value.name, iconUrl:value.iconUrl }; });

        return (
            <Page>
                <Grid>
                    <GridColumn medium={8}>
                        <div>
                            <Banner isOpen={this.state.isBannerOpen} appearance="announcement">
                                Issue <Button appearance='link' onClick={() => this.postMessage({action:'openIssue',key:this.state.createdIssue.key})}>{this.state.createdIssue.key}</Button> has been created.
                            </Banner>
                            <h2>Create Issue</h2>
                            <JiraProjectSelect selectedOption={this.state.selectedProject} initialOptions={this.state.availableProjects} onSelect={this.onProjectSelected} onQuery={this.handleProjectInput}/>
                            <Field className='ak-formfield'
                                    label="Issue Type"
                                    isRequired={true}
                                    >
                                    <Select
                                        className="ak-select-container"
                                        classNamePrefix="ak-select"
                                        name="issuetype"
                                        options={issueTypes}
                                        placeholder="Select Issue Type"
                                        components={{ Option: IconOption, SingleValue:ValueComponent }}
                                        getOptionLabel={(option:any) => option.name}
                                        getOptionValue={(option:any) => option.id}
                                        value={this.state.selectedIssueType}
                                        onChange={this.onIssueTypeSelected}
                                        isDisabled={this.state.isSomethingLoading}
                                    />
                                </Field>
                            <Form
                                name="layout-example"
                                onSubmit={this.handleSubmit}
                                ref={(form:any) => {
                                    this.formRef = form;
                                }}
                                >
                                {renderableFields}
                                <FormFooter actions={{}}>
                                    <Button type="submit" className='ak-button' isLoading={this.state.loadingField === 'submitButton'}>
                                    Submit
                                    </Button>
                                </FormFooter>
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
                return (
                    <Field label={field.name} isRequired={field.required}>
                        <textarea
                        style={{width:'100%', display:'block'}}
                        id={field.key}
                        className='ak-textarea'
                        rows={3}
                        onChange={this.setTextFieldValue} 
                        value={this.state.fieldValues[field.key]}
                        disabled={this.state.isSomethingLoading}
                        />
                    </Field>
                );
            }
            case UIType.Input: {
                return (
                    <Field label={field.name} isRequired={field.required}>
                        <input style={{width:'100%', display:'block'}} className='ak-inputField' id={field.key} onChange={this.setTextFieldValue} value={this.state.fieldValues[field.key]}/>
                    </Field>
                );
            }
            case UIType.Checkbox: {
                let checkboxItems:any[] = [];
                const checkField = field as OptionableScreenField;
                checkField.allowedValues.forEach(value => {
                    checkboxItems.push(
                        <label>{value.value}: <input type='checkbox' id={field.key} onChange={this.setCheckboxValue} value={value.id} checked={this.state.fieldValues[field.key] !== undefined && this.state.fieldValues[field.key].contains(value.id)}/></label>
                    );
                });
                return (
                    <Field label={field.name} isRequired={field.required}>
                       <div>{checkboxItems}</div>
                    </Field>
                );
            }
            case UIType.Radio: {
                let radioItems:any[] = [];
                const radioField = field as OptionableScreenField;
                radioField.allowedValues.forEach(value => {
                    radioItems.push(
                        <label>hello</label>
                    );
                });
                return (
                    <Field label={field.name} isRequired={field.required}>
                       <div>{radioItems}</div>
                    </Field>
                );
            }
            case UIType.Date: {

                return (
                    <Field label={field.name} isRequired={field.required}>
                        <DatePicker 
                            onChange={(value:any) => {
                                this.setState({fieldValues:{...this.state.fieldValues,...{[field.key]:value}}});
                                console.log('date value', this.state.fieldValues[field.key]);
                            }}
                            className="ak-select-container"
                            value={this.state.fieldValues[field.key]}
                            selectProps={{className:"ak-select-container", classNamePrefix:"ak-select"}}
                            />
                    </Field>
                );
            }
            case UIType.DateTime: {
                return (
                    <Field label={field.name} isRequired={field.required}>
                        <DateTimePicker 
                            onChange={(value:any) => {
                                this.setState({fieldValues:{...this.state.fieldValues,...{[field.key]:value}}});
                                console.log('date value', this.state.fieldValues[field.key]);
                            }}
                            className="ak-select-container"
                            value={this.state.fieldValues[field.key]}
                            datePickerSelectProps={{className:"ak-select-container", classNamePrefix:"ak-select"}}
                            timePickerSelectProps={{className:"ak-select-container", classNamePrefix:"ak-select"}}
                            />
                    </Field>
                );
            }
            case UIType.User: {
                return (
                    <Field label={field.name} isRequired={field.required}>
                        <input style={{width:'100%', display:'block'}} className='ak-inputField' id={field.key} onChange={this.setTextFieldValue} value={this.state.fieldValues[field.key]}/>
                    </Field>
                );
            }
            case UIType.Select: {
                const selectField = field as SelectScreenField;
                if(selectField.isCreateable) {
                    return this.createableSelect(selectField);
                }

                return (
                    <Field label={selectField.name} isRequired={selectField.required}>
                        <Select
                            id={field.key}
                            isMulti={selectField.isMulti}
                            isClearable={!field.required}
                            className="ak-select-container"
                            classNamePrefix="ak-select"
                            getOptionLabel={(option:any) => (option.name) ? option.name : option.value}
                            getOptionValue={(option:any) => option.id}
                            value={this.state.fieldValues[field.key]}
                            onChange={(selected:any) => {
                                this.setState({fieldValues:{...this.state.fieldValues,...{[field.key]:selected}}});
                            }}
                            options={this.state.fieldOptions[field.key]}
                            isDisabled={this.state.isSomethingLoading}
                            components={(selectField.allowedValues.length > 0 && selectField.allowedValues[0].iconUrl)? { Option: IconOption, SingleValue:ValueComponent }: {}}
                        />
                    </Field>
                );
            }
        }

        return (
            <Field label={field.name} isRequired={field.required}>
                <input style={{width:'100%', display:'block'}} className='ak-inputField' id={field.key} onChange={this.setTextFieldValue} value={this.state.fieldValues[field.key]}/>
            </Field>
        );
    }

    createableSelect(field:SelectScreenField):any {
        if(field.key === 'labels') {
            return (
                <Field label={field.name} isRequired={field.required}>
                    <AsyncCreatableSelect
                        loadOptions={this.loadLabelOptions}
                        id={field.key}
                        isMulti={field.isMulti}
                        isClearable={!field.required}
                        className="ak-select-container"
                        classNamePrefix="ak-select"
                        getOptionLabel={(option:any) => option}
                        getOptionValue={(option:any) => option}
                        value={this.state.fieldValues[field.key]}
                        onChange={(selected:any) => {
                            this.setState({fieldValues:{...this.state.fieldValues,...{[field.key]:selected}}});
                        }}
                        defaultOptions={this.state.fieldOptions[field.key]}
                        onCreateOption={(input:any):void => {this.handleLabelCreate(input,field.key);}}
                        isLoading={this.state.loadingField === field.key}
                        isDisabled={this.state.isSomethingLoading}
                        isValidNewOption = {(inputValue:any, selectValue:any, selectOptions:any[]) => {
                            if (
                                inputValue.trim().length === 0 ||
                                selectOptions.find(option => option === inputValue)
                            ) {
                                return false;
                            }
                            return true;
                            }}
                        getNewOptionData={(inputValue:any, optionLabel:any) => (inputValue)}
                    >

                    </AsyncCreatableSelect>
                </Field>
            );
        }

        return(
            <Field label={field.name} isRequired={field.required}>
                <CreatableSelect
                    id={field.key}
                    isMulti={field.isMulti}
                    isClearable={!field.required}
                    className="ak-select-container"
                    classNamePrefix="ak-select"
                    getOptionLabel={(option:any) => option.name}
                    getOptionValue={(option:any) => option.id}
                    value={this.state.fieldValues[field.key]}
                    onChange={(selected:any) => {
                        this.setState({fieldValues:{...this.state.fieldValues,...{[field.key]:selected}}});
                    }}
                    options={this.state.fieldOptions[field.key]}
                    onCreateOption={(input:any):void => {this.handleOptionCreate(input,field.key);}}
                    isLoading={this.state.loadingField === field.key}
                    isDisabled={this.state.isSomethingLoading}
                    isValidNewOption = {(inputValue:any, selectValue:any, selectOptions:any[]) => {
                        if (
                            inputValue.trim().length === 0 ||
                            selectOptions.find(option => option.name === inputValue)
                        ) {
                            return false;
                        }
                        return true;
                        }}
                    getNewOptionData={(inputValue:any, optionLabel:any) => ({
                        id: inputValue,
                        name: optionLabel,
                    })}
                />
            </Field>
        );
    }
}
