import * as React from 'react';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Button from '@atlaskit/button';
import styled from 'styled-components';
import DisplayFeedback from './DisplayFeedback';
import { Action } from '../../../ipc/messaging';
import { FeedbackData, SubmitFeedbackAction } from '../../../ipc/configActions';
const bitbucketLogo:string =require('../images/bitbucket-logo.png');
const strideLogo:string =require('../images/stride-logo.png');

export const InlineFlex = styled.div`
display: inline-flex;
align-items: center;
justify-content: space-between;
`;

type Emit = SubmitFeedbackAction | Action;
export default class WelcomePage extends WebviewComponent<Emit, {}, {},{}> {
    constructor(props: any) {
        super(props);
    }

    public onMessageReceived(e: any) {

    }

    handleConfigure = () => {
        this.postMessage({action:'showConfigPage'});
    }

    handleSourceLink = () => {
        this.postMessage({action:'sourceLink'});
    }

    handleHelpLink = () => {
        this.postMessage({action:'helpLink'});
    }

    handleFeedback = (feedback:FeedbackData) => {
        this.postMessage({action:'submitFeedback', feedback:feedback});
    }
   
    public render() {
        const bbicon = <img src={bitbucketLogo} width="15" height="14"/>;
        const strideicon = <img src={strideLogo} width="17" height="12"/>;
        return (
            <Page>
                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn>
                        <h1>Welcome To AtlasCode!</h1>
                        <InlineFlex>
                            <div style={{ marginRight:'3em' }}><Button className='ak-button' onClick={this.handleConfigure}>Configure Atlascode</Button></div>
                            <DisplayFeedback onFeedback={this.handleFeedback} />
                            <Button className='ak-link-button' appearance="link" iconBefore={bbicon} onClick={this.handleSourceLink}>Source Code</Button>
                            <Button className='ak-link-button' appearance="link" iconBefore={strideicon} onClick={this.handleHelpLink}>Need Help?</Button>
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