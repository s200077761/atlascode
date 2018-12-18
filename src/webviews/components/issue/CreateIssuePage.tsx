import * as React from 'react';
import { Action } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreateIssueData, ProjectList, CreatedSomething, isCreatedSomething, isIssueCreated } from '../../../ipc/issueMessaging';
import JiraProjectSelect from '../JiraProjectSelect';
import { emptyWorkingProject, WorkingProject } from '../../../config/model';
import { FetchProjectsAction, ScreensForProjectsAction, CreateSomethingAction, CreateIssueAction, OpenIssueAction } from '../../../ipc/issueActions';
import Form, { Field, FormFooter } from '@atlaskit/form';
import Select, { CreatableSelect, components } from '@atlaskit/select';
import Button from '@atlaskit/button';
import Banner from '@atlaskit/banner';
import Page, { Grid, GridColumn } from "@atlaskit/page";
// import { Editor } from '@atlaskit/editor-core';
// import { JIRATransformer } from '@atlaskit/editor-jira-transformer';

type Emit = FetchProjectsAction | ScreensForProjectsAction | CreateSomethingAction | CreateIssueAction | OpenIssueAction | Action;
type Accept = CreateIssueData | ProjectList | CreatedSomething;
type IssueType = { id:string, name:string, iconUrl:string };
type Version = { id:string, name:string, archived:boolean, released:boolean };
interface ViewState extends CreateIssueData {
    isSomethingLoading:boolean;
    loadingField:string;
    versionOptions:any[];
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
    versionOptions:[],
    isSomethingLoading:false,
    loadingField:'',
    isBannerOpen:false,
    createdIssue:{}
};

const emptyVersion = {id:'',name:'',archived:false, released:false};

const { Option } = components;

const IconOption = (props:any) => (
    <Option {...props}>
      <span><img src={props.data.iconUrl}/>{props.label}</span>
    </Option>
);

const ValueComponent = (props:any) => (
      <components.SingleValue {...props}>
        <span><img src={props.data.iconUrl}/>{props.data.name}</span>
      </components.SingleValue>

  );

export default class CreateIssuePage extends WebviewComponent<Emit, Accept, {},ViewState> {
    private newProjects:WorkingProject[] = [];
    private newVersion:Version;

    private formRef:any;

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    getVersionOptions(typeId:string|undefined, issueData:CreateIssueData):any[] {
        let vOpts:any[] = [];

        if(typeId) {
            console.log('looking for version field',typeId);
            const vField = issueData.issueTypeScreens[typeId].fields.find(field => field.key === 'fixVersions');
            console.log('version field is',vField);
            if(vField && vField.allowedValues) {
                let unreleasedOpts = vField.allowedValues.filter(opt => {return !opt.released;});
                let releasedOpts = vField.allowedValues.filter(opt => {return opt.released;});

                vOpts = [
                    {label:'Unreleased Versions', options:unreleasedOpts}
                    ,{label:'Released Versions', options:releasedOpts}
                ];
                console.log('vOpts',vOpts);
            }
        }
        
        return vOpts;
    }

    onMessageReceived(e:Accept): void {
        switch (e.type) {
            case 'screenRefresh': {
                const issueData = e as CreateIssueData;
                
                this.setState({...issueData, ...{versionOptions:this.getVersionOptions(issueData.selectedIssueType.id,issueData)}});
                console.log('got refresh',this.state.versionOptions);
                break;
            }
            case 'projectList': {
                this.newProjects = (e as ProjectList).availableProjects;
                break;
            }
            case 'versionCreated': {
                if(isCreatedSomething(e)){
                    this.newVersion = (e.createdData as Version);
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
        console.log('selected type',selected);
        this.setState({selectedIssueType:selected, versionOptions:this.getVersionOptions(selected.id,this.state)});
    }

    onVersionCreate = (input:any):void => {
        this.setState({isSomethingLoading:true, loadingField:'fixVersions'});
        this.postMessage({action:'createVersion', createData:{name:input,project:this.state.selectedProject.key}});
        let timer = setInterval(() => {
            if(this.newVersion && this.newVersion.id.length > 0) {
                clearInterval(timer);
                if(this.newVersion.id !== 'error') {
                    let newVals = this.state.fieldValues.fixVersions;
                    if(!newVals) {
                        newVals = [];
                    }
                    newVals.push(this.newVersion);
                    this.setState({isSomethingLoading:false, loadingField:'', fieldValues:{...this.state.fieldValues,...{fixVersions:newVals}}, versionOptions:[...this.state.versionOptions, this.newVersion]});
                } else {
                    this.setState({isSomethingLoading:false, loadingField:''});
                }
                this.newVersion = emptyVersion;
            }
        }, 500);
    }

    validateRequiredInput = (val:string,opts?:any):boolean => {
        let valid = true;
        if(opts && opts.required) {
            if(val.length < 1) {
                valid = false;
            }
        }

        return valid;
    }

    onSubmit = (e?:any):void => {
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
                                onSubmit={this.onSubmit}
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

    getFieldMarkup(field:JIRA.Schema.FieldMetaBean):any {
        if(field.key === 'description') {
            return (
                <Field
                    label={field.name}
                    isRequired={field.required}
                    >
                        <textarea
                        style={{width:'100%', display:'block'}}
                        id={field.key}
                        className='ak-textarea'
                        rows={3}
                        placeholder='add description'
                        onChange={this.setTextFieldValue} 
                        value={this.state.fieldValues[field.key]}
                        disabled={this.state.isSomethingLoading}
                        />
                </Field>
                // <Editor
                //     appearance="comment"
                //     placeholder="What do you want to say?"
                //     allowCodeBlocks={true}
                //     allowLists={true}
                //     allowRule={true}
                //     contentTransformerProvider={(schema:any) =>
                //       new JIRATransformer(schema)
                //     }
                //   />
            );
        }

        if(field.key === 'fixVersions') {
            
            return(
                <Field label={field.name} isRequired={field.required}>
                    <CreatableSelect
                        id={field.key}
                        isMulti={true}
                        isClearable={true}
                        className="ak-select-container"
                        classNamePrefix="ak-select"
                        getOptionLabel={(option:any) => option.name}
                        getOptionValue={(option:any) => option.id}
                        value={this.state.fieldValues[field.key]}
                        onChange={(selected:any) => {
                            this.setState({fieldValues:{...this.state.fieldValues,...{fixVersions:selected}}});
                        }}
                        options={this.state.versionOptions}
                        onCreateOption={this.onVersionCreate}
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

        return (
            <Field label={field.name} isRequired={field.required} width>
                <input style={{width:'100%', display:'block'}} className='ak-inputField' id={field.key} onChange={this.setTextFieldValue} value={this.state.fieldValues[field.key]}/>
            </Field>
        );
    }
}
