import * as React from 'react';
import Button from '@atlaskit/button';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import { BreadcrumbsStateless, BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Panel from '@atlaskit/panel';
import Tooltip from '@atlaskit/tooltip';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import CheckCircleOutlineIcon from '@atlaskit/icon/glyph/check-circle-outline';
import Reviewers from './Reviewers';
import Commits from './Commits';
import Comments from './Comments';
import { WebviewComponent } from '../WebviewComponent';
import { PRData, CheckoutResult, isPRData, isCheckoutError } from '../../../ipc/prMessaging';
import { Approve, Merge, Checkout, PostComment } from '../../../ipc/prActions';
import CommentForm from './CommentForm';
import BranchInfo from './BranchInfo';
import styled from 'styled-components';

export const Spacer = styled.div`
margin-left: 10px;
margin-right: 10px;
`;

export const InlineFlex = styled.div`
display: inline-flex;
align-items: center;
`;

type Emit = Approve | Merge | Checkout | PostComment;
type Receive = PRData | CheckoutResult;

export default class PullRequestPage extends WebviewComponent<Emit, Receive, {}, { pr: PRData, isApproveButtonLoading: boolean, isMergeButtonLoading:boolean, branchError?: string }> {
    constructor(props: any) {
        super(props);
        this.state = { pr: { type: '', currentBranch: '' }, isApproveButtonLoading: false, isMergeButtonLoading: false };
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

    onMessageReceived(e: Receive): void {
        if (isPRData(e)) {
            this.setState({ pr: e, isApproveButtonLoading: false, isMergeButtonLoading: false });
        }
        else if (isCheckoutError(e)) {
            this.setState({ branchError: e.error, pr: { ...this.state.pr, currentBranch: e.currentBranch } });
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
            <InlineFlex>
                <Reviewers {...this.state.pr} />
                <Spacer>
                    <Tooltip content={currentUserApproved ? '✔ You approved this pull request' : ''}>
                        <Button className='ak-button' iconBefore={<CheckCircleOutlineIcon label='approve' />}
                            isDisabled={currentUserApproved}
                            isLoading={this.state.isApproveButtonLoading}
                            onClick={this.handleApprove}>
                            Approve
                        </Button>
                    </Tooltip>
                </Spacer>
                <Button className='ak-button'
                    isDisabled={!isPrOpen}
                    isLoading={this.state.isMergeButtonLoading}
                    onClick={this.handleMerge}>
                    {isPrOpen ? 'Merge' : pr.state}
                </Button>
                {
                    this.state.pr.errors && <Tooltip content={this.state.pr.errors}><WarningIcon label='pr-warning' /></Tooltip>
                }
            </InlineFlex>
        );
        const breadcrumbs = (
            <BreadcrumbsStateless onExpand={() => { }}>
                <BreadcrumbsItem text={this.state.pr.pr!.destination!.repository!.name} key={this.state.pr.pr!.destination!.repository!.name} href={this.state.pr.pr!.destination!.repository!.links!.html!.href} />
                <BreadcrumbsItem text="Pull requests" key="Pull requests" />
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
                                bottomBar={<BranchInfo prData={this.state.pr} error={this.state.branchError} postMessage={(e: Emit) => this.postMessage(e)} />}
                            >
                                <p>{pr.title}</p>
                            </PageHeader>
                            <hr />
                            <Panel isDefaultExpanded header={<h3>Summary</h3>}>
                                <p dangerouslySetInnerHTML={{ __html: pr.summary!.html! }} />
                            </Panel>
                            <hr />
                            <Panel isDefaultExpanded header={<h3>Commits</h3>}>
                                <Commits {...this.state.pr} />
                            </Panel>
                            <hr />
                            <Panel isDefaultExpanded header={<h3>Comments</h3>}>
                                <Comments prData={this.state.pr} onComment={this.handlePostComment} />
                                <CommentForm currentUser={this.state.pr.currentUser!} visible={true} onSave={this.handlePostComment} />
                            </Panel>
                        </GridColumn>
                    </Grid>
                </Page>
            </div>
        );
    }
}