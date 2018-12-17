import * as React from 'react';
import { Action } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreateIssueData, ProjectList } from '../../../ipc/issueMessaging';
import JiraProjectSelect from '../JiraProjectSelect';
import { emptyWorkingProject, WorkingProject } from '../../../config/model';
import { FetchProjectsAction, ScreensForProjectsAction } from '../../../ipc/issueActions';
import Form, { Field, FormFooter } from '@atlaskit/form';
//import FieldText from '@atlaskit/field-text';
import Select, { components } from '@atlaskit/select';
import Button from '@atlaskit/button';

type Emit = FetchProjectsAction | ScreensForProjectsAction | Action;
type Accept = CreateIssueData | ProjectList;
type IssueType = { id:string, name:string, iconUrl:string };


const emptyState:CreateIssueData = {
    type:'',
    selectedProject:emptyWorkingProject,
    availableProjects:[],
    selectedIssueType:{},
    issueTypeScreens:{}
};

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

export default class CreateIssuePage extends WebviewComponent<Emit, Accept, {},CreateIssueData> {
    private newProjects:WorkingProject[] = [];
    private formRef:any;

    constructor(props: any) {
        super(props);
        this.state = emptyState;
        console.log('empty',this.state.issueTypeScreens);
        console.log(IconOption);
    }

    onMessageReceived(e:Accept): void {
        switch (e.type) {
            case 'screenRefresh': {
                this.setState(e as CreateIssueData);
                console.log('got refresh',this.state.selectedIssueType);
                break;
            }
            case 'projectList': {
                this.newProjects = (e as ProjectList).availableProjects;
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
        this.setState({selectedIssueType:selected});
    }

    onSubmit = (e?:any):void => {
        console.log('onSubmitHandler', e);
        // Calling validate on the form will update it's fields state
        const validateResult = this.formRef.validate();
        console.log(validateResult);
    
        if (validateResult.isInvalid) {
          console.log('onSubmitHandler = Form Fields Invalid');
        } else {
          // Now call submit when your done
          console.log('valid submit',this.formRef);
        }
    }
    
    issueTypeOptionLabel = (option:IssueType) => {
        return option.name;
    }

    issueTypeOptionValue = (option:IssueType) => {
        console.log('issuetype get value', option.id);
        return option.id;
    }

    
    public render() {
        let renderableFields: any[] = [];

        if(this.state.selectedIssueType.id) {
            console.log('current map', this.state.issueTypeScreens);
            
            const screen = this.state.issueTypeScreens[this.state.selectedIssueType.id];
            if(screen) {
                screen.fields.forEach(field => {
                    console.log('CREATING NEW FIELD',field.name);
                    const fieldMarkup = (
                        <Field
                        label={field.name}
                        isRequired={field.required}
                        >
                        <input name={field.name} defaultValue='' key={field.id + '_' + this.state.selectedIssueType.id}/>
                    </Field>
                    );

                    renderableFields.push(fieldMarkup);
                });
            }
        }
        
        const issueTypes = Object.entries(this.state.issueTypeScreens).map(([key, value]) => { return { id:value.id, name:value.name, iconUrl:value.iconUrl }; });

        return (
            <div>
                <h3>Create Issue</h3>
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
                            getOptionLabel={this.issueTypeOptionLabel}
                            getOptionValue={this.issueTypeOptionValue}
                            value={this.state.selectedIssueType}
                            onChange={this.onIssueTypeSelected}
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
                        <Button type="submit" className='ak-button'>
                        Submit
                        </Button>
                    </FormFooter>
                </Form>
            </div>
        );
    }
}
