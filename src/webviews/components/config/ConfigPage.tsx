import * as React from 'react';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import { Action } from '../../../ipc/messaging';
import { IConfig } from '../../../config/model';

export default class ConfigPage extends WebviewComponent<Action, IConfig, {},{}> {
    constructor(props: any) {
        super(props);
    }

    public render() {
        return (
            <Page>
                <Grid>
                    <GridColumn medium={8}>Config Page</GridColumn>
                </Grid>
            </Page>
        );
    }

    public onMessageReceived(e: IConfig) {

    }
}