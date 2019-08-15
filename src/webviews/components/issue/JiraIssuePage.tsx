import * as React from 'react';
import { CommonEditorPageEmit, CommonEditorPageAccept, CommonEditorViewState, AbstractIssueEditorPage, emptyCommonEditorState } from './AbstractIssueEditorPage';
import { EditIssueData, emptyEditIssueData, isIssueCreated } from '../../../ipc/issueMessaging';
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
                case 'issueCreated': {
                    if (isIssueCreated(e)) {
                        this.setState({ isSomethingLoading: false, loadingField: '' });
                    }
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

    protected handleInlineEdit = (field: FieldUI, newValue: any) => {
        console.log(field.uiType);
        if (field.uiType === UIType.Subtasks) {
            /* newValue will be:
            {
                summary: string;
                issuetype: {id:number}
            }
            */
            this.setState({ isSomethingLoading: true, loadingField: 'subtasks' });
            const payload: any = newValue;
            payload.project = { key: this.state.key.substring(0, this.state.key.indexOf('-')) };
            payload.parent = { key: this.state.key };
            this.postMessage({ action: 'createIssue', site: this.state.siteDetails, issueData: { fields: payload } });

        } else if (field.uiType === UIType.IssueLinks) {
            this.setState({ isSomethingLoading: true, loadingField: 'issuelinks' });

            this.postMessage({
                action: 'createIssueLink'
                , site: this.state.siteDetails
                , issueLinkData: {
                    type: {
                        id: newValue.type.id
                    },
                    inwardIssue: newValue.type.type === 'inward' ? { key: newValue.issueKey } : { key: this.state.key },
                    outwardIssue: newValue.type.type === 'outward' ? { key: newValue.issueKey } : { key: this.state.key }
                }
                , issueLinkType: newValue.type
            });
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
                    <div className='ac-vpadding'>
                        <label className='ac-field-label' htmlFor='description'>{this.state.fields['description'].name}</label>
                        {this.getInputMarkup(this.state.fields['description'], true)}
                    </div>
                }
                {this.state.fields['environment'] && !this.state.isEpic &&
                    <div className='ac-vpadding'>
                        <label className='ac-field-label' htmlFor='environment'>{this.state.fields['environment'].name}</label>
                        {this.getInputMarkup(this.state.fields['environment'], true)}
                    </div>
                }

                {this.state.isEpic &&
                    <div className='ac-vpadding'>
                        <label className='ac-field-label' htmlFor='epicchildren'>Issues in this epic</label>
                        <IssueList issues={this.state.epicChildren} onIssueClick={this.handleOpenIssue} />
                    </div>
                }

                {this.state.fields['subtasks'] && !this.state.isEpic &&
                    <div className='ac-vpadding'>
                        {this.getInputMarkup(this.state.fields['subtasks'], true)}
                        <IssueList issues={this.state.fieldValues['subtasks']} onIssueClick={this.handleOpenIssue} />
                    </div>
                }
                {this.state.fields['issuelinks'] &&
                    <div className='ac-vpadding'>
                        {this.getInputMarkup(this.state.fields['issuelinks'], true)}
                        <LinkedIssues issuelinks={this.state.fieldValues['issuelinks']} onIssueClick={this.handleOpenIssue} />
                    </div>
                }
                {this.state.fields['comment'] &&
                    <div className='ac-vpadding'>
                        <label className='ac-field-label' htmlFor='comment'>{this.state.fields['comment'].name}</label>
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
