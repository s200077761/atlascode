import * as React from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Reviewers from './Reviewers';
import Commits from './Commits';
import Comments from './Comments';
import { WebviewComponent } from '../WebviewComponent';
import { PRData } from '../../../ipc/prMessaging';
import { Action, Alert } from '../../../ipc/messaging';
import { PostComment } from '../../../ipc/prActions';
import CommentForm from './CommentForm';

type Emit = Action | Alert | PostComment;

export default class PullRequestPage extends WebviewComponent<Emit, PRData, {}, { pr: PRData, isApproveButtonLoading: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { pr: { type: '' }, isApproveButtonLoading: false };
    }

    componentUpdater = (data: PRData) => { };

    alertHandler = (e: any) => {
        this.postMessage({
            action: 'alertError',
            message: 'checkout clicked'
        });
    }

    onApprove = () => {
        this.setState({ ...this.state, ...{ isApproveButtonLoading: true } });
        this.postMessage({
            action: 'approve'
        });
    }

    postCommentHandler = (content: string, parentCommentId?: number) => {
        this.postMessage({
            action: 'comment',
            content: content,
            parentCommentId: parentCommentId
        });
    }

    public onMessageReceived(e: PRData) {
        console.log("got message from vscode", e);
        this.state = { ...this.state, ...{ pr: e, isApproveButtonLoading: false } };
        this.componentUpdater(e);
    }

    componentWillMount() {
        this.componentUpdater = (data) => {
            const newState = { ...this.state, ...{ pr: data } };
            this.setState(newState);
        };
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
                        <Button spacing="compact">{pr.source!.branch!.name}</Button> → <Button spacing="compact">{pr.destination!.branch!.name}</Button>
                    </GridColumn>
                    <GridColumn medium={4}>
                        <Reviewers {...this.state.pr} />
                        <ButtonGroup>
                            <Button onClick={this.alertHandler} className='ak-button'>Checkout</Button>
                            {!currentUserApproved && <Button isLoading={this.state.isApproveButtonLoading} onClick={this.onApprove} className='ak-button'>Approve</Button>}
                        </ButtonGroup>
                        {currentUserApproved && <p>✔ You have approved this PR</p>}
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
                        <Comments prData={this.state.pr} onComment={this.postCommentHandler} />
                        <CommentForm currentUser={this.state.pr.currentUser!} visible={true} onSave={this.postCommentHandler} />
                    </GridColumn>
                </Grid>
            </Page>
        );
    }
}