import * as React from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Tag from '@atlaskit/tag';
import Reviewers from './Reviewers';
import Commits from './Commits';
import Comments from './Comments';
import { WebviewComponent } from '../WebviewComponent';
import { PRData } from '../../../ipc/prMessaging';
import { Approve, Checkout, PostComment } from '../../../ipc/prActions';
import CommentForm from './CommentForm';
import BranchInfo from './BranchInfo';

type Emit = Approve | Checkout | PostComment;

export default class PullRequestPage extends WebviewComponent<Emit, PRData, {}, { pr: PRData, isApproveButtonLoading: boolean }> {
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

    onMessageReceived(e: PRData): void {
        this.setState({ pr: e, isApproveButtonLoading: false });
    }

    render() {
        const pr = this.state.pr.pr!;
        if (!pr) { return <div></div>; }

        let currentUserApproved = pr.participants!
            .filter((participant) => participant.user!.account_id === this.state.pr.currentUser!.account_id)
            .reduce((acc, curr) => !!acc || !!curr.approved, false);
        return (
            <Page>
                <Grid>
                    <GridColumn medium={8}>
                        <h2><a href={pr.links!.html!.href}>#{pr.id}</a>  {pr.title}</h2>
                        <BranchInfo prData={this.state.pr} postMessage={(e: Emit) => this.postMessage(e)} />
                    </GridColumn>
                    <GridColumn medium={4}>
                        <Reviewers {...this.state.pr} />
                        {!currentUserApproved
                            ? <Button className='ak-button' isLoading={this.state.isApproveButtonLoading} onClick={this.handleApprove}>Approve</Button>
                            : <p> <Tag text="✔ You approved this PR" color="green" /></p>
                        }
                    </GridColumn>
                    <GridColumn>
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