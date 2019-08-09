import * as React from 'react';
import { CommonEditorPageEmit, CommonEditorPageAccept, CommonEditorViewState, AbstractIssueEditorPage, emptyCommonEditorState } from './AbstractIssueEditorPage';
import { EditIssueData, emptyEditIssueData } from '../../../ipc/issueMessaging';
import Offline from '../Offline';
import ErrorBanner from '../ErrorBanner';
import PageHeader from '@atlaskit/page-header';
import Page, { Grid, GridColumn } from "@atlaskit/page";
import Button, { ButtonGroup } from "@atlaskit/button";
import { BreadcrumbsStateless, BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import NavItem from './NavItem';
import SizeDetector from "@atlaskit/size-detector";
import { FieldUI, UIType } from '../../../jira/jira-client/model/fieldUI';
import { EditIssueAction } from '../../../ipc/issueActions';
import { CommentList } from './CommentList';
import IssueList from './IssueList';
import LinkedIssues from './LinkedIssues';

type Emit = CommonEditorPageEmit | EditIssueAction;
type Accept = CommonEditorPageAccept | EditIssueData;

type SizeMetrics = {
    width: number;
    height: number;
};

interface ViewState extends CommonEditorViewState, EditIssueData {
}

const emptyState: ViewState = {
    ...emptyCommonEditorState,
    ...emptyEditIssueData,
};

export default class JiraIssuePage extends AbstractIssueEditorPage<Emit, Accept, {}, ViewState> {

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    onMessageReceived(e: any): boolean {
        let handled = super.onMessageReceived(e);

        if (!handled) {
            switch (e.type) {
                case 'update': {
                    const issueData = e as EditIssueData;
                    this.setState({ ...issueData, ...{ isErrorBannerOpen: false, errorDetails: undefined, isSomethingLoading: false, loadingField: '' } });
                    break;
                }
                case 'fieldValueUpdate': {
                    console.log('fieldValueUpdate', e);
                    this.setState({ isSomethingLoading: false, loadingField: '', fieldValues: { ...this.state.fieldValues, ...e.fieldValues } });
                    break;
                }
            }
        }
        return handled;
    }

    handleCopyIssueLink = () => {
        this.postMessage({
            action: 'copyJiraIssueLink'
        });
    }

    handleStartWorkOnIssue = () => {
        this.postMessage({
            action: 'openStartWorkPage'
            , issue: { key: this.state.key, siteDetails: this.state.siteDetails }
        });
    }

    protected handleInlineEditTextfield = (field: FieldUI, newValue: string) => {
        if (field.uiType === UIType.Subtasks) {

        } else {
            //NOTE: we need to update the state here so if there's an error we will detect the change and re-render with the old value
            this.setState({ fieldValues: { ...this.state.fieldValues, ...{ [field.key]: newValue } } }, () => {
                this.handleEditIssue(field.key, newValue);
            });
        }
    }

    handleEditIssue = (fieldKey: string, newValue: any) => {
        this.postMessage({
            action: 'editIssue',
            fields: {
                [fieldKey]: newValue
            }
        });
    }

    protected handleCommentSave = (comment: string) => {
        this.setState({ isSomethingLoading: true, loadingField: 'comment' });
        this.postMessage({
            action: "comment",
            issue: { key: this.state.key, siteDetails: this.state.siteDetails },
            comment: comment
        });
    }

    /*
    , 'fixVersions'
    , 'components'
    , 'labels'
    , 'assignee'
    , 'reporter'
    , 'priority'
    , 'status'
    , 'issuetype'
    , 'attachment'
    */
    getMainPanelMarkup(): any {
        if (Object.keys(this.state.fields).length < 1) {
            return <div>Loading Data...</div>;
        }

        return (
            <div>
                {!this.state.isOnline &&
                    <Offline />
                }
                {this.state.isErrorBannerOpen &&
                    <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                }

                {/* {this.state.showPMF &&
                    <PMFBBanner onPMFVisiblity={(visible: boolean) => this.setState({ showPMF: visible })} onPMFLater={() => this.onPMFLater()} onPMFNever={() => this.onPMFNever()} onPMFSubmit={(data: PMFData) => this.onPMFSubmit(data)} />
                } */}
                <PageHeader
                    actions={<ButtonGroup>
                        <Button className='ac-button' onClick={this.handleStartWorkOnIssue}>Start work on issue...</Button>
                    </ButtonGroup>}
                    breadcrumbs={
                        <BreadcrumbsStateless onExpand={() => { }}>
                            {(this.state.fieldValues['epicLink'] && this.state.fieldValues['epicLink'] !== '') &&
                                <BreadcrumbsItem component={() => <NavItem text={`${this.state.fieldValues['epicLink']}`} onItemClick={() => this.handleOpenIssue('')} />} />
                            }
                            {this.state.fieldValues['parentKey'] &&
                                <BreadcrumbsItem component={() => <NavItem text={`${this.state.fieldValues['parentKey']}`} onItemClick={() => this.handleOpenIssue('')} />} />
                            }
                            <BreadcrumbsItem component={() => <NavItem text={`${this.state.key}`} href={`${this.state.siteDetails.baseLinkUrl}/browse/${this.state.key}`} iconUrl={this.state.fieldValues['issuetype'].iconUrl} onCopy={this.handleCopyIssueLink} />} />
                        </BreadcrumbsStateless>
                    }>
                    {this.getInputMarkup(this.state.fields['summary'], true)}
                </PageHeader>
                {this.state.fields['description'] &&
                    <div>
                        <label className='ac-field-label' htmlFor={this.state.fields['description'].key}>{this.state.fields['description'].name}</label>
                        {this.getInputMarkup(this.state.fields['description'], true)}
                    </div>
                }
                {this.state.fields['environment'] &&
                    <div>
                        <label className='ac-field-label' htmlFor={this.state.fields['environment'].key}>{this.state.fields['environment'].name}</label>
                        {this.getInputMarkup(this.state.fields['environment'], true)}
                    </div>
                }

                {this.state.fields['subtasks'] &&
                    <div>
                        <label className='ac-field-label' htmlFor={this.state.fields['subtasks'].key}>{this.state.fields['subtasks'].name}</label>
                        {this.getInputMarkup(this.state.fields['subtasks'], true)}
                        <IssueList issues={this.state.fieldValues['subtasks']} onIssueClick={this.handleOpenIssue} />
                    </div>
                }
                {this.state.fields['issuelinks'] &&
                    <div>
                        <label className='ac-field-label' htmlFor={this.state.fields['issuelinks'].key}>{this.state.fields['issuelinks'].name}</label>
                        {this.getInputMarkup(this.state.fields['issuelinks'], true)}
                        <LinkedIssues issuelinks={this.state.fieldValues['issuelinks']} onIssueClick={this.handleOpenIssue} />;
                    </div>
                }
                {this.state.fields['comment'] &&
                    <div>
                        <label className='ac-field-label' htmlFor={this.state.fields['comment'].key}>{this.state.fields['comment'].name}</label>
                        <CommentList comments={this.state.fieldValues['comment'].comments} />
                        {this.getInputMarkup(this.state.fields['comment'], true)}
                    </div>
                }
            </div>
        );
    }

    public render() {
        return (
            <Page>
                <SizeDetector>
                    {(size: SizeMetrics) => {
                        if (size.width < 800) {
                            return (
                                <div>
                                    {this.getMainPanelMarkup()}
                                </div>
                            );
                        }
                        return (
                            <div style={{ maxWidth: '1200px', margin: 'auto' }}>
                                <Grid layout="fluid">
                                    <GridColumn medium={8}>
                                        {this.getMainPanelMarkup()}
                                    </GridColumn>
                                </Grid>
                            </div>
                        );
                    }}
                </SizeDetector>
            </Page>
        );
    }
}
