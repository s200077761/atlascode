import * as React from 'react';
import { AbstractIssueEditorPage, CommonEditorPageAccept, CommonEditorPageEmit, CommonEditorViewState, emptyCommonEditorState } from "./AbstractIssueEditorPage";
import { CreateIssueData, PreliminaryIssueData } from "../../../ipc/issueMessaging";
import { emptyWorkingProject } from '../../../config/model';
import { epicsDisabled } from "../../../jira/jiraCommon";
import Page, { Grid, GridColumn } from "@atlaskit/page";
import SectionMessage from '@atlaskit/section-message';
import Offline from '../Offline';
import ErrorBanner from '../ErrorBanner';
import Button from '@atlaskit/button';
import Panel from '@atlaskit/panel';
import Form, { FormFooter } from '@atlaskit/form';
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import { FieldUI } from '../../../jira/jira-client/model/fieldUI';

type Emit = CommonEditorPageEmit | OpenJiraIssueAction;
type Accept = CommonEditorPageAccept | CreateIssueData;
interface ViewState extends CommonEditorViewState, CreateIssueData {
    isCreateBannerOpen: boolean;
    createdIssue: any;
}

const emptyState: ViewState = {
    ...emptyCommonEditorState,
    selectedProject: emptyWorkingProject,
    availableProjects: [],
    selectedIssueTypeId: '',
    issueTypeScreens: {},
    epicFieldInfo: epicsDisabled,
    transformerProblems: {},
    isCreateBannerOpen: false,
    createdIssue: {},

};

/*
interface ViewState extends CreateIssueData {
    fieldOptions: { [k: string]: any };
    isCreateBannerOpen: boolean;
    isErrorBannerOpen: boolean;
    errorDetails: any;
    createdIssue: any;
    defaultIssueType: any;
    fieldValues: { [k: string]: any };
}
*/

/*
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
*/
const createdFromAtlascodeFooter = `\n\n_~Created from~_ [_~Atlassian for VS Code~_|https://marketplace.visualstudio.com/items?itemName=Atlassian.atlascode]`;

export default class CreateIssuePage extends AbstractIssueEditorPage<Emit, Accept, {}, ViewState> {
    // private issueTypes: any[] = [];

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    onMessageReceived(e: any): boolean {
        let handled = super.onMessageReceived(e);

        if (!handled) {
            switch (e.type) {
                case 'preliminaryIssueData': {
                    const data = e as PreliminaryIssueData;
                    this.setState({ fieldValues: { ...this.state.fieldValues, ...{ description: `${data.description}${createdFromAtlascodeFooter}`, summary: data.summary } } });
                    break;
                }

                case 'screenRefresh': {
                    const issueData = e as CreateIssueData;
                    //this.issueTypes = Object.entries(issueData.issueTypeScreens).map(([key, value]) => { return { id: value.id, name: value.name, iconUrl: value.iconUrl }; });

                    this.setState({ ...issueData, ...{ isSomethingLoading: false, loadingField: '' } });
                    break;
                }
            }
        }

        return handled;
    }

    handleSubmit = async (e: any) => {
        // let requiredFields = this.state.issueTypeScreens[this.state.selectedIssueTypeId!].fields.filter(field => { return field.required; });
        // let errs = {};
        // requiredFields.forEach((field: FieldUI) => {
        //     if (e[field.key] === undefined || (e[field.key].length < 1)) {
        //         errs[field.key] = 'EMPTY';
        //     }
        // });


        // if (Object.keys(errs).length > 0) {
        //     return errs;
        // }

        // // TODO: [VSCODE-439] find a better way to transform submit data or deal with different select option shapes
        // if (e[this.state.epicFieldInfo.epicLink.id]) {
        //     let val: any = e[this.state.epicFieldInfo.epicLink.id];
        //     e[this.state.epicFieldInfo.epicLink.id] = val.id;
        // }

        // this.setState({ isSomethingLoading: true, loadingField: 'submitButton', isCreateBannerOpen: false });
        // this.postMessage({ action: 'createIssue', issueData: e });

        return undefined;
    }

    public render() {
        let renderableFields: any[] = [];
        let advancedFields: any[] = [];
        if (this.state.selectedIssueTypeId && this.state.selectedIssueTypeId !== '') {

            const screen = this.state.issueTypeScreens[this.state.selectedIssueTypeId];
            if (screen && screen.fields && Object.keys(screen.fields).length > 0) {
                renderableFields = [];
                advancedFields = [];
                const orderedValues: FieldUI[] = this.sortFieldValues(screen.fields);

                orderedValues.forEach(field => {
                    (field.advanced) ? advancedFields.push(this.getFieldMarkup(field)) : renderableFields.push(this.getFieldMarkup(field));

                });
                console.log('screen fields', screen.fields);

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
                                        Issue <Button className='ac-banner-link-button' appearance="link" spacing="none" onClick={() => { console.log('sending open issue', this.state.createdIssue.key); this.postMessage({ action: 'openJiraIssue', issueOrKey: this.state.createdIssue }); }}>{this.state.createdIssue.key}</Button> has been created.
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
                                        {/* <Field defaultValue={this.state.selectedProject}
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
                                        </Field> */}

                                        {/* <Field defaultValue={this.state.defaultIssueType}
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
                                        </Field> */}

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
}
