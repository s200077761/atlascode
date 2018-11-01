import * as React from 'react';
import Button, { ButtonGroup } from '@atlaskit/button';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import { State } from '../App';
import Reviewers from './Reviewers';
import Commits from './Commits';
import Comments from './Comments';

export default class PullRequestPage extends React.Component<State, {}> {
    constructor(props: any) {
        super(props);
    }

    alertHandler = (e: any) => {
        this.props.postMessageToVSCode({
            action: 'alert'
        });
    }

    onApprove = () => {
        this.props.postMessageToVSCode({
            action: 'approve'
        });
    }

    render() {
        const pr = this.props.pr!;
        if (!pr) { return <div></div>; }
        return (
            <Page>
                <Grid>
                    <GridColumn medium={8}>
                        <h2><a href={pr.links!.html!.href}>#{pr.id}</a>  {pr.title}</h2>
                        <Button spacing="compact">{pr.source!.branch!.name}</Button> → <Button spacing="compact">{pr.destination!.branch!.name}</Button>
                    </GridColumn>
                    <GridColumn medium={4}>
                        <Reviewers {...this.props} />
                        <ButtonGroup>
                            <Button onClick={this.alertHandler} appearance="primary">Checkout</Button>
                            <Button onClick={this.onApprove} appearance="primary">Approve</Button>
                        </ButtonGroup>
                    </GridColumn>
                    <GridColumn>
                        <hr />
                        <h3>Commits</h3>
                        <Commits {...this.props} />
                        <hr />
                        <h3>Summary</h3>
                        <p dangerouslySetInnerHTML={{ __html: pr.summary!.html! }}>
                        </p>
                        <hr />
                        <h3>Comments</h3>
                        <Comments {...this.props} />
                    </GridColumn>
                </Grid>
            </Page>
        );
    }
}