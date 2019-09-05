import * as React from 'react';
import { AbstractIssueEditorPage, CommonEditorPageAccept, CommonEditorPageEmit, CommonEditorViewState, emptyCommonEditorState } from "./AbstractIssueEditorPage";
import { CreateIssueData, emptyCreateIssueData, isIssueCreated } from "../../../ipc/issueMessaging";
import Page, { Grid, GridColumn } from "@atlaskit/page";
import SectionMessage from '@atlaskit/section-message';
import Offline from '../Offline';
import ErrorBanner from '../ErrorBanner';
import Button from '@atlaskit/button';
import Panel from '@atlaskit/panel';
import Form, { FormFooter } from '@atlaskit/form';
import { FieldUI, ValueType } from '../../../jira/jira-client/model/fieldUI';
import { AtlLoader } from '../AtlLoader';

type Emit = CommonEditorPageEmit;
type Accept = CommonEditorPageAccept | CreateIssueData;
interface ViewState extends CommonEditorViewState, CreateIssueData {
    isCreateBannerOpen: boolean;
    createdIssue: any;
}

const emptyState: ViewState = {
    ...emptyCommonEditorState,
    ...emptyCreateIssueData,
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
    private advancedFields: FieldUI[] = [];
    private commonFields: FieldUI[] = [];

    getProjectKey(): string {
        return this.state.fieldValues['project'].key;
    }

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    onMessageReceived(e: any): boolean {
        let handled = super.onMessageReceived(e);

        if (!handled) {
            switch (e.type) {
                case 'update': {
                    const issueData = e as CreateIssueData;
                    this.updateInternals(issueData);
                    this.setState({ ...issueData, ...{ isSomethingLoading: false, loadingField: '' } });
                    break;
                }
                case 'currentUserUpdate': {
                    this.setState({ currentUser: e.currentUser });
                }
                case 'issueCreated': {
                    if (isIssueCreated(e)) {
                        this.setState({ isSomethingLoading: false, loadingField: '', isCreateBannerOpen: true, createdIssue: e.issueData, fieldValues: { ...this.state.fieldValues, ...{ description: createdFromAtlascodeFooter, summary: '' } } });
                    }
                    break;
                }
            }
        }

        return handled;
    }

    updateInternals(data: CreateIssueData) {
        const orderedValues: FieldUI[] = this.sortFieldValues(data.fields);
        this.advancedFields = [];
        this.commonFields = [];

        orderedValues.forEach(field => {
            if (field.advanced) {
                this.advancedFields.push(field);
            } else {
                this.commonFields.push(field);
            }
        });
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

    protected handleInlineEdit = (field: FieldUI, newValue: any) => {
        switch (field.uiType) {
            // case UIType.Subtasks: {
            //     /* newValue will be:
            //     {
            //         summary: string;
            //         issuetype: {id:number}
            //     }
            //     */
            //     this.setState({ isSomethingLoading: true, loadingField: field.key });
            //     const payload: any = newValue;
            //     payload.project = { key: this.getProjectKey() };
            //     payload.parent = { key: this.state.key };
            //     this.postMessage({ action: 'createIssue', site: this.state.siteDetails, issueData: { fields: payload } });

            //     break;
            // }
            // case UIType.IssueLinks: {
            //     this.setState({ isSomethingLoading: true, loadingField: 'issuelinks' });

            //     this.postMessage({
            //         action: 'createIssueLink'
            //         , site: this.state.siteDetails
            //         , issueLinkData: {
            //             type: {
            //                 id: newValue.type.id
            //             },
            //             inwardIssue: newValue.type.type === 'inward' ? { key: newValue.issueKey } : { key: this.state.key },
            //             outwardIssue: newValue.type.type === 'outward' ? { key: newValue.issueKey } : { key: this.state.key }
            //         }
            //         , issueLinkType: newValue.type
            //     });
            //     break;
            // }
            // case UIType.Timetracking: {
            //     let newValObject = this.state.fieldValues[field.key];
            //     if (newValObject) {
            //         newValObject.originalEstimate = newValue;
            //     } else {
            //         newValObject = {
            //             originalEstimate: newValue
            //         };
            //     }
            //     this.setState({ loadingField: field.key, isSomethingLoading: true, fieldValues: { ...this.state.fieldValues, ...{ [field.key]: newValObject } } }, () => {
            //         this.handleEditIssue(`${field.key}`, { originalEstimate: newValue });
            //     });
            //     break;
            // }
            // case UIType.Worklog: {
            //     this.setState({ isSomethingLoading: true, loadingField: field.key });
            //     this.postMessage({ action: 'createWorklog', site: this.state.siteDetails, worklogData: newValue, issueKey: this.state.key });
            //     break;
            // }

            default: {
                let typedVal = newValue;

                if (field.valueType === ValueType.Number && typeof newValue !== 'number') {
                    typedVal = parseFloat(newValue);
                }
                this.setState({ fieldValues: { ...this.state.fieldValues, ...{ [field.key]: typedVal } } });
                break;
            }
        }
    }

    getCommonFieldMarkup(): any {
        return this.commonFields.map(field => this.getInputMarkup(field));
    }

    getAdvancedFieldMarkup(): any {
        return this.advancedFields.map(field => this.getInputMarkup(field));
    }

    public render() {
        if (!this.state.fieldValues['issuetype'] || this.state.fieldValues['issuetype'].id === '' && !this.state.isErrorBannerOpen && this.state.isOnline) {
            return <AtlLoader />;
        }

        if (Object.keys(this.state.fields).length < 1) {
            this.setState({ isErrorBannerOpen: true, errorDetails: `No fields found for issue type ${this.state.fieldValues['issuetype'].name}` });
        }

        return (
            <Page>
                <Grid>
                    <GridColumn medium={8}>
                        <div>
                            {!this.state.isOnline &&
                                <Offline />
                            }
                            {/* {this.state.showPMF &&
                    <PMFBBanner onPMFVisiblity={(visible: boolean) => this.setState({ showPMF: visible })} onPMFLater={() => this.onPMFLater()} onPMFNever={() => this.onPMFNever()} onPMFSubmit={(data: PMFData) => this.onPMFSubmit(data)} />
                } */}
                            {this.state.isCreateBannerOpen &&
                                <div className='fade-in'>
                                    <SectionMessage
                                        appearance="confirmation"
                                        title="Issue Created">
                                        <p>Issue <Button className='ac-banner-link-button' appearance="link" spacing="none" onClick={() => { this.handleOpenIssue(this.state.createdIssue); }}>{this.state.createdIssue.key}</Button> has been created.</p>
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
                                        {this.getCommonFieldMarkup()}
                                        <Panel isDefaultExpanded={false} header={<h4>Advanced Options</h4>}>
                                            <div>{this.getAdvancedFieldMarkup()}</div>
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
