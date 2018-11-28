import * as React from 'react';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Button from '@atlaskit/button';
import styled from 'styled-components';
import DisplayFeedback from './DisplayFeedback';
import { Action } from '../../../ipc/messaging';

export const InlineFlex = styled.div`
display: inline-flex;
align-items: center;
justify-content: space-between;
`;

type Emit = Action;
export default class WelcomePage extends WebviewComponent<Emit, {}, {},{}> {
    constructor(props: any) {
        super(props);
    }

    public onMessageReceived(e: any) {

    }

    handleConfigure = () => {
        this.postMessage({action:'showConfigPage'});
    }
   
    public render() {
        return (
            <Page>
                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn>
                        <h1>Welcome To AtlasCode!</h1>
                        <InlineFlex>
                        <div style={{ marginRight:'3em' }}><Button className='ak-button' onClick={this.handleConfigure}>Configure Atlascode</Button></div>
                        <DisplayFeedback />
                        </InlineFlex>
                    </GridColumn>
                </Grid>

                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn medium={9}>
                        <h2>What's New in 0.0.1</h2>
                        <p>everything.</p>
                    </GridColumn>
                </Grid>
            </Page>
        );
    }
}