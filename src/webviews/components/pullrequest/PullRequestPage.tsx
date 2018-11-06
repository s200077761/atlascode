import * as React from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Reviewers from './Reviewers';
import Commits from './Commits';
import Comments from './Comments';
import { WebviewComponent } from '../WebviewComponent';
import { PRAction } from '../../../ipc/prAction';
import { Action, Alert } from '../../../ipc/action';

type Emit = Action | Alert;
export default class PullRequestPage extends WebviewComponent<Emit, PRAction, {},{ pr:PRAction, isApproveButtonLoading: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { pr: {action:''}, isApproveButtonLoading: false };
    }

    componentUpdater = (data: PRAction) => { };

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

    public onMessageReceived(e: PRAction) {
        console.log("got message from vscode", e);
        this.state = { ...this.state, ...{pr:e,isApproveButtonLoading: false} };
        this.componentUpdater(e);
    }

    componentWillMount() {

        this.componentUpdater = (data) => { 
            const newState = { ...this.state, ...{pr:data} };
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
                            <Button onClick={this.alertHandler} appearance="primary">Checkout</Button>
                            {!currentUserApproved && <Button isLoading={this.state.isApproveButtonLoading} onClick={this.onApprove} appearance="primary">Approve</Button>}
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
                        <Comments {...this.state.pr} />
                    </GridColumn>
                </Grid>
            </Page>
        );
    }
}