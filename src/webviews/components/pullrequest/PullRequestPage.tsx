import * as React from 'react';
import Button from '@atlaskit/button';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Tag from '@atlaskit/tag';
import Reviewers from './Reviewers';
import Commits from './Commits';
import Comments from './Comments';
import { WebviewComponent } from '../WebviewComponent';
import { PRData, CheckoutResult, isPRData, isCheckoutError } from '../../../ipc/prMessaging';
import { Approve, Checkout, PostComment } from '../../../ipc/prActions';
import CommentForm from './CommentForm';
import BranchInfo from './BranchInfo';
import styled from 'styled-components';

export const Spacer = styled.div`
margin: 10px;
`;

export const InlineFlex = styled.div`
display: inline-flex;
align-items: center;
`;

type Emit = Approve | Checkout | PostComment;
type Receive = PRData | CheckoutResult;

export default class PullRequestPage extends WebviewComponent<Emit, Receive, {}, { pr: PRData, isApproveButtonLoading: boolean, branchError?: string }> {
    constructor(props: any) {
        super(props);
        this.state = { pr: { type: '', currentBranch: '' }, isApproveButtonLoading: false };
    }

    handleApprove = () => {
        this.setState({ isApproveButtonLoading: true });
        this.postMessage({
            action: 'approve'
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
            this.setState({ pr: e, isApproveButtonLoading: false });
        }
        else if (isCheckoutError(e)) {
            this.setState({ branchError: e.error, pr: { ...this.state.pr, currentBranch: e.currentBranch } });
        }
    }

    render() {
        const pr = this.state.pr.pr!;
        if (!pr) { return <div></div>; }

        let currentUserApproved = pr.participants!
            .filter((participant) => participant.user!.account_id === this.state.pr.currentUser!.account_id)
            .reduce((acc, curr) => !!acc || !!curr.approved, false);

        const actionsContent = (
            <InlineFlex>
                <Reviewers {...this.state.pr} />
                <Spacer>
                    {!currentUserApproved
                        ? <Button className='ak-button' isLoading={this.state.isApproveButtonLoading} onClick={this.handleApprove}>Approve</Button>
                        : <p> <Tag text="✔ You approved this PR" color="green" /></p>
                    }
                </Spacer>
            </InlineFlex>
        );

        return (
            <Page>
                <Grid>
                    <GridColumn>
                        <PageHeader
                            actions={actionsContent}
                            bottomBar={<BranchInfo prData={this.state.pr} error={this.state.branchError} postMessage={(e: Emit) => this.postMessage(e)} />}
                        >
                            <p><a href={pr.links!.html!.href}>#{pr.id}</a>  {pr.title}</p>
                        </PageHeader>
                        <hr />
                        <h3>Commits</h3>
                        <Commits {...this.state.pr} />
                        <hr />
                        <h3>Summary</h3>
                        <p dangerouslySetInnerHTML={{ __html: pr.summary!.html! }}>
                        </p>
                        <hr />
                        <h3>Comments</h3>
                        <Comments prData={this.state.pr} onComment={this.handlePostComment} />
                        <CommentForm currentUser={this.state.pr.currentUser!} visible={true} onSave={this.handlePostComment} />
                    </GridColumn>
                </Grid>
            </Page >
        );
    }
}