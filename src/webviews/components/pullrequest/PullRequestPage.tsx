import * as React from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import { BreadcrumbsStateless, BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Panel from '@atlaskit/panel';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import CheckCircleOutlineIcon from '@atlaskit/icon/glyph/check-circle-outline';
import BitbucketIcon from '@atlaskit/logo/dist/esm/BitbucketLogo/Icon';
import Reviewers from './Reviewers';
import Commits from './Commits';
import Comments from './Comments';
import { WebviewComponent } from '../WebviewComponent';
import { PRData, CheckoutResult, isPRData, isCheckoutError } from '../../../ipc/prMessaging';
import { Approve, Merge, Checkout, PostComment } from '../../../ipc/prActions';
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import CommentForm from './CommentForm';
import BranchInfo from './BranchInfo';
import { Issue } from '../../../jira/jiraModel';
import IssueList from '../issue/IssueList';
import BuildStatus from './BuildStatus';

type Emit = Approve | Merge | Checkout | PostComment | OpenJiraIssueAction;
type Receive = PRData | CheckoutResult;

export default class PullRequestPage extends WebviewComponent<Emit, Receive, {}, { pr: PRData, isApproveButtonLoading: boolean, isMergeButtonLoading: boolean, isCheckoutButtonLoading: boolean, branchError?: string }> {
    constructor(props: any) {
        super(props);
        this.state = { pr: { type: '', currentBranch: '', relatedJiraIssues: [] }, isApproveButtonLoading: false, isMergeButtonLoading: false, isCheckoutButtonLoading: false };
    }

    handleApprove = () => {
        this.setState({ isApproveButtonLoading: true });
        this.postMessage({
            action: 'approve'
        });
    }

    handleMerge = () => {
        this.setState({ isMergeButtonLoading: true });
        this.postMessage({
            action: 'merge'
        });
    }

    handlePostComment = (content: string, parentCommentId?: number) => {
        this.postMessage({
            action: 'comment',
            content: content,
            parentCommentId: parentCommentId
        });
    }

    handleIssueClicked = (issue: Issue) => {
        this.postMessage({
            action: 'openJiraIssue',
            issue: issue
        });
    }

    handleCheckout = (branchName: string) => {
        this.setState({ isCheckoutButtonLoading: true });
        this.postMessage({
            action: 'checkout',
            branch: branchName,
            isSourceBranch: true
        });
    }

    onMessageReceived(e: Receive): void {
        if (isPRData(e)) {
            this.setState({ pr: e, isApproveButtonLoading: false, isMergeButtonLoading: false, isCheckoutButtonLoading: false });
        }
        else if (isCheckoutError(e)) {
            this.setState({ branchError: e.error, pr: { ...this.state.pr, currentBranch: e.currentBranch }, isCheckoutButtonLoading: false });
        } else {
            this.setState({ isCheckoutButtonLoading: false });
        }
    }

    render() {
        const pr = this.state.pr.pr!;
        if (!pr) { return <div></div>; }
        const isPrOpen = pr.state === "OPEN";

        let currentUserApproved = pr.participants!
            .filter((participant) => participant.user!.account_id === this.state.pr.currentUser!.account_id)
            .reduce((acc, curr) => !!acc || !!curr.approved, false);

        const actionsContent = (
            <ButtonGroup>
                <Reviewers {...this.state.pr} />
                <Tooltip content={currentUserApproved ? '✔ You approved this pull request' : ''}>
                    <Button className='ac-button' iconBefore={<CheckCircleOutlineIcon label='approve' />}
                        isDisabled={currentUserApproved}
                        isLoading={this.state.isApproveButtonLoading}
                        onClick={this.handleApprove}>
                        Approve
                        </Button>
                </Tooltip>
                <Button className='ac-button'
                    isDisabled={!isPrOpen}
                    isLoading={this.state.isMergeButtonLoading}
                    onClick={this.handleMerge}>
                    {isPrOpen ? 'Merge' : pr.state}
                </Button>
                <Tooltip content='Open pull request on bitbucket.org'>
                    <Button className='ac-button' href={pr.links!.html!.href} iconBefore={<BitbucketIcon />} />
                </Tooltip>
                {
                    this.state.pr.errors && <Tooltip content={this.state.pr.errors}><WarningIcon label='pr-warning' /></Tooltip>
                }
            </ButtonGroup>
        );
        const breadcrumbs = (
            <BreadcrumbsStateless onExpand={() => { }}>
                <BreadcrumbsItem text={this.state.pr.pr!.destination!.repository!.name} key={this.state.pr.pr!.destination!.repository!.name} href={this.state.pr.pr!.destination!.repository!.links!.html!.href} />
                <BreadcrumbsItem text="Pull requests" key="Pull requests" href={`${this.state.pr.pr!.destination!.repository!.links!.html!.href}/pull-requests`} />
                <BreadcrumbsItem text={pr.id} key={pr.id} href={pr.links!.html!.href} />
            </BreadcrumbsStateless>
        );

        return (
            <div className='bitbucket-page'>
                <Page>
                    <Grid>
                        <GridColumn>
                            <PageHeader
                                actions={actionsContent}
                                breadcrumbs={breadcrumbs}
                            >
                                <p>{pr.title}</p>
                            </PageHeader>
                            <div className='ac-flex-space-between'>
                                <BranchInfo prData={this.state.pr} error={this.state.branchError} postMessage={(e: Emit) => this.postMessage(e)} />
                                <div className='ac-flex'>
                                    <Button className='ac-button' spacing='compact' isDisabled={this.state.isCheckoutButtonLoading || pr.source!.branch!.name! === this.state.pr.currentBranch} isLoading={this.state.isCheckoutButtonLoading} onClick={() => this.handleCheckout(pr.source!.branch!.name!)}>
                                        {pr.source!.branch!.name! === this.state.pr.currentBranch ? 'Source branch checked out' : 'Checkout source branch'}
                                    </Button>
                                    <BuildStatus buildStatuses={this.state.pr.buildStatuses} />
                                </div>
                            </div>
                            <Panel isDefaultExpanded header={<h3>Summary</h3>}>
                                <p dangerouslySetInnerHTML={{ __html: pr.summary!.html! }} />
                            </Panel>
                            {
                                !this.state.pr.commits && !this.state.pr.comments && !this.state.pr.relatedJiraIssues
                                    ? <div className='ac-block-centered'><Spinner size="large" /></div>
                                    : <React.Fragment>
                                        {
                                            this.state.pr.relatedJiraIssues && this.state.pr.relatedJiraIssues.length > 0 &&
                                            <Panel isDefaultExpanded header={<h3>Related Jira Issues</h3>}>
                                                <IssueList issues={this.state.pr.relatedJiraIssues} postMessage={(e: OpenJiraIssueAction) => this.postMessage(e)} />
                                            </Panel>
                                        }
                                        <Panel isDefaultExpanded header={<h3>Commits</h3>}>
                                            <Commits {...this.state.pr} />
                                        </Panel>
                                        <Panel isDefaultExpanded header={<h3>Comments</h3>}>
                                            <Comments prData={this.state.pr} onComment={this.handlePostComment} />
                                            <CommentForm currentUser={this.state.pr.currentUser!} visible={true} onSave={this.handlePostComment} />
                                        </Panel>
                                    </React.Fragment>
                            }
                        </GridColumn>
                    </Grid>
                </Page>
            </div>
        );
    }
}