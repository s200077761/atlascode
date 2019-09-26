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
import { FieldUI, ValueType, UIType } from '../../../jira/jira-client/model/fieldUI';
import { AtlLoader } from '../AtlLoader';
import { IssueKeyAndSite } from '../../../jira/jira-client/model/entities';
import { emptySiteInfo, DetailedSiteInfo } from '../../../atlclients/authInfo';
import PMFBBanner from '../pmfBanner';
import { PMFData } from '../../../ipc/messaging';
import Select, { components } from '@atlaskit/select';
import { Field } from '@atlaskit/form';
import { chain } from '../fieldValidators';
import Spinner from '@atlaskit/spinner';

type Emit = CommonEditorPageEmit;
type Accept = CommonEditorPageAccept | CreateIssueData;
interface ViewState extends CommonEditorViewState, CreateIssueData {
    isCreateBannerOpen: boolean;
    createdIssue: IssueKeyAndSite;
}

const emptyState: ViewState = {
    ...emptyCommonEditorState,
    ...emptyCreateIssueData,
    isCreateBannerOpen: false,
    createdIssue: { key: '', siteDetails: emptySiteInfo },

};

const IconOption = (props: any) => (
    <components.Option {...props}>
        <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', alignItems: 'center' }}><img src={props.data.avatarUrl} width="24" height="24" /><span style={{ marginLeft: '10px' }}>{props.data.name}</span></div>
    </components.Option>
);

const IconValue = (props: any) => (
    <components.SingleValue {...props}>
        <div style={{ display: 'flex', alignItems: 'center' }}><img src={props.data.avatarUrl} width="16" height="16" /><span style={{ marginLeft: '10px' }}>{props.data.name}</span></div>
    </components.SingleValue>

);

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
                    handled = true;
                    const issueData = e as CreateIssueData;
                    this.updateInternals(issueData);
                    this.setState(issueData, () => {
                        this.setState({ isSomethingLoading: false, loadingField: '' });
                    });

                    break;
                }
                case 'currentUserUpdate': {
                    handled = true;
                    this.setState({ currentUser: e.currentUser });
                    break;
                }
                case 'issueCreated': {
                    handled = true;
                    if (isIssueCreated(e)) {
                        this.setState({ isErrorBannerOpen: false, errorDetails: undefined, isSomethingLoading: false, loadingField: '', isCreateBannerOpen: true, createdIssue: e.issueData, fieldValues: { ...this.state.fieldValues, ...{ description: createdFromAtlascodeFooter, summary: '' } } });
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
        let requiredFields = Object.values(this.state.fields).filter(field => field.required);

        let errs = {};
        requiredFields.forEach((field: FieldUI) => {

            if (field.uiType === UIType.Worklog && this.state.fieldValues[`${field.key}.enabled`]) {
                const timeSpent = this.state.fieldValues[`${field.key}.timeSpent`];
                const newEstimate = this.state.fieldValues[`${field.key}.newEstimate`];
                const started = this.state.fieldValues[`${field.key}.started`];
                const comment = this.state.fieldValues[`${field.key}.comment`];

                if (timeSpent === undefined || (timeSpent.length < 1)) {
                    errs[`${field.key}.timeSpent`] = 'EMPTY';
                }
                if (newEstimate === undefined || (newEstimate.length < 1)) {
                    errs[`${field.key}.newEstimate`] = 'EMPTY';
                }
                if (started === undefined || (started.length < 1)) {
                    errs[`${field.key}.started`] = 'EMPTY';
                }
                if (comment === undefined || (comment.length < 1)) {
                    errs[`${field.key}.comment`] = 'EMPTY';
                }
            }

            const val = this.state.fieldValues[field.key];
            if (val === undefined || (val.length < 1)) {
                errs[field.key] = 'EMPTY';
            }
        });


        if (Object.keys(errs).length > 0) {
            return errs;
        }

        this.setState({ isSomethingLoading: true, loadingField: 'submitButton', isCreateBannerOpen: false });
        this.postMessage({ action: 'createIssue', site: this.state.siteDetails, issueData: this.state.fieldValues });

        return undefined;
    }

    handleSiteChange = (site: DetailedSiteInfo) => {
        this.setState({ siteDetails: site, loadingField: 'site', isSomethingLoading: true });
        this.postMessage({
            action: 'getScreensForSite'
            , site: site
        });
    }

    protected handleInlineEdit = (field: FieldUI, newValue: any) => {
        let typedVal = newValue;
        let fieldkey = field.key;

        if (typedVal === undefined) {
            this.setState({ fieldValues: { ...this.state.fieldValues, ...{ [fieldkey]: typedVal } } });
            return;
        }

        if (field.valueType === ValueType.Number && typeof newValue !== 'number') {
            typedVal = parseFloat(newValue);
        }

        if (field.key.indexOf('.') > -1) {
            let valObj = {};
            const splits = field.key.split('.');
            fieldkey = splits[0];
            if (this.state.fieldValues[splits[0]]) {
                valObj = this.state.fieldValues[splits[0]];
            }
            valObj[splits[1]] = typedVal;
            typedVal = valObj;
        }

        if (field.uiType === UIType.Attachment) {
            if (Array.isArray(newValue) && newValue.length > 0) {
                const serFiles = newValue.map((file: any) => {
                    return {
                        lastModified: file.lastModified,
                        lastModifiedDate: file.lastModifiedDate,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        path: file.path,
                    };
                });

                typedVal = serFiles;
            }
        }

        this.setState({ fieldValues: { ...this.state.fieldValues, ...{ [fieldkey]: typedVal } } });


        if (field.valueType === ValueType.Project) {
            this.setState({ loadingField: field.key, isSomethingLoading: true });
            this.postMessage({
                action: 'getScreensForProject'
                , project: newValue
                , fieldValues: this.state.fieldValues
            });
        }

        if (field.valueType === ValueType.IssueType) {
            this.setState({ loadingField: field.key, isSomethingLoading: true });
            this.postMessage({
                action: 'setIssueType'
                , issueType: newValue
                , fieldValues: this.state.fieldValues
            });
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
                            {this.state.showPMF &&
                                <PMFBBanner onPMFOpen={this.onPMFOpen} onPMFVisiblity={(visible: boolean) => this.setState({ showPMF: visible })} onPMFLater={() => this.onPMFLater()} onPMFNever={() => this.onPMFNever()} onPMFSubmit={(data: PMFData) => this.onPMFSubmit(data)} />
                            }
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
                            <div className='ac-vpadding'>
                                <div className='ac-flex'><h2>Create Issue</h2>{this.state.isSomethingLoading && <div className='spinner' style={{ marginLeft: '15px' }}><Spinner size='medium' /></div>}</div>
                            </div>
                            <Form
                                name="create-issue"
                                onSubmit={this.handleSubmit}
                            >
                                {(frmArgs: any) => {
                                    return (<form {...frmArgs.formProps}>
                                        <Field label='Select Site'
                                            id='site'
                                            name='site'
                                            defaultValue={this.state.siteDetails}
                                        >
                                            {
                                                (fieldArgs: any) => {
                                                    return (
                                                        <Select
                                                            {...fieldArgs.fieldProps}
                                                            className="ac-select-container"
                                                            classNamePrefix="ac-select"
                                                            getOptionLabel={(option: any) => option.name}
                                                            getOptionValue={(option: any) => option.id}
                                                            options={this.state.selectFieldOptions['site']}
                                                            components={{ Option: IconOption, SingleValue: IconValue }}
                                                            onChange={chain(fieldArgs.fieldProps.onChange, this.handleSiteChange)}
                                                        />
                                                    );
                                                }
                                            }
                                        </Field>
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
                        </div>
                    </GridColumn>
                </Grid>
            </Page >
        );
    }
}
