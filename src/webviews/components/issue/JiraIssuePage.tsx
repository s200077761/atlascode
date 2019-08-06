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
import { FieldUI } from '../../../jira/jira-client/model/fieldUI';

type Emit = CommonEditorPageEmit;
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
            console.log('ui got message', e);
            switch (e.type) {
                case 'update': {
                    const issueData = e as EditIssueData;
                    this.setState({ ...issueData, ...{ isErrorBannerOpen: false, errorDetails: undefined, isSomethingLoading: false, loadingField: '' } });
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

    protected handleInlineEditTextfield = (field: FieldUI, newValue: string) => {
        this.handleEditIssue(field.key, newValue);
    }

    handleEditIssue = (fieldKey: string, newValue: any) => {
        this.postMessage({
            action: 'editIssue',
            fields: {
                [fieldKey]: newValue
            }
        });
    }
    /*
    editIssue = (fieldName: string, value: any) => {
    const editedIssueData = { ...this.state.data, [fieldName]: value };
    this.setState({ data: editedIssueData });

    this.postMessage({
      action: 'editIssue',
      fields: {
        [fieldName]: editedIssueData[fieldName]
      }
    });
  }
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
                        <Button className='ac-button' onClick={() => this.postMessage({ action: 'openStartWorkPage', issue: {} })}>Start work on issue...</Button>
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
                    {this.getFieldMarkup(this.state.fields['summary'], true)}
                </PageHeader>
                {/* <p dangerouslySetInnerHTML={{ __html: issue.descriptionHtml }} /> */}
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
