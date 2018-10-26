import * as React from 'react';
import Button from '@atlaskit/button';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import AvatarGroup from '@atlaskit/avatar-group';
import { State } from './App';

export default class PullRequestPage extends React.Component<State, {}> {
    constructor(props: any) {
        super(props);
        this.alertHandler = this.alertHandler.bind(this);
    }

    alertHandler(e: any) {
        this.props.postMessageToVSCode({
            action: 'alert'
        });
    }

    render() {
        const pr = this.props.pr;
        if (!pr) { return <div>No data.</div>; }
        const participants = pr.participants!.map(p => { return { name: p.user!.username!, src: p.user!.links!.avatar!.href! }; });
        return (
            pr &&
            < Page >
                <Grid>
                    <GridColumn medium={8}>
                        <h2><a href={pr.links!.html!.href}>#{pr.id}</a>  {pr.title}</h2>
                        <Button spacing="compact">{pr.source!.branch!.name}</Button> → <Button spacing="compact">{pr.destination!.branch!.name}</Button>
                    </GridColumn>
                    <GridColumn medium={4}>
                        <p>
                            <AvatarGroup
                                appearance="grid"
                                data={participants}
                                maxCount={14}
                                size="medium"
                            />
                        </p>
                        <Button onClick={this.alertHandler}>Checkout</Button>
                    </GridColumn>
                    <GridColumn>
                        <hr />
                        <h3>Summary</h3>
                        <p dangerouslySetInnerHTML={{ __html: pr.summary!.html! }}>
                        </p>
                        <hr />
                    </GridColumn>
                </Grid>
            </Page >
        );
    }
}