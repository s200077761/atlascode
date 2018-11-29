import * as React from 'react';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Collapsible from 'react-collapsible';
import { ButtonGroup } from '@atlaskit/button';
import Button from '@atlaskit/button';
import { AuthAction, SaveSettingsAction } from '../../../ipc/configActions';
import { AuthProvider } from '../../../atlclients/authInfo';
import JiraExplorer from './JiraExplorer';
import styled from 'styled-components';
import { ConfigData, emptyConfigData } from '../../../ipc/configMessaging';
import BitbucketExplorer from './BBExplorer';
import StatusBar from './StatusBar';
import DisplayFeedback from './DisplayFeedback';
import { Action } from '../../../ipc/messaging';
const bitbucketLogo:string =require('../images/bitbucket-logo.png');
const strideLogo:string =require('../images/stride-logo.png');

type changeObject = {[key: string]:any};

const Trigger = (heading:string,subheading:string) => 
    <div>
    <h2>{heading}</h2>
    <p>{subheading}</p>
    </div>;

export const InlineFlex = styled.div`
display: inline-flex;
align-items: center;
justify-content: space-between;
width: 100%;
`;
  
type Emit = AuthAction | SaveSettingsAction | Action;
export default class ConfigPage extends WebviewComponent<Emit, ConfigData, {},ConfigData> {
    constructor(props: any) {
        super(props);
        this.state = emptyConfigData;
    }

    public onMessageReceived(e: ConfigData) {
        console.log("got message from vscode", e);
        this.setState(e);
    }

    public onConfigChange = (change:changeObject, removes?:string[]) => {
        console.log('ConfigPage got change', change);

        this.postMessage({action:'saveSettings', changes:change, removes:removes});
    }

    handleJiraLogin = () => {
        this.handleLogin(AuthProvider.JiraCloud);
    }

    handleBBLogin = () => {
        this.handleLogin(AuthProvider.BitbucketCloud);
    }

    handleJiraLogout = () => {
        console.log('handle jira logout');
        this.handleLogout(AuthProvider.JiraCloud);
    }

    handleBBLogout = () => {
        this.handleLogout(AuthProvider.BitbucketCloud);
    }

    handleLogin = (provider:string) => {
        this.postMessage({action:'login', provider:provider});
    }

    handleLogout = (provider:string) => {
        this.postMessage({action:'logout', provider});
    }

    handleSourceLink = () => {
        this.postMessage({action:'sourceLink'});
    }

    handleHelpLink = () => {
        this.postMessage({action:'helpLink'});
    }

    public render() {
        const bbicon = <img src={bitbucketLogo} width="15" height="14"/>;
        const strideicon = <img src={strideLogo} width="17" height="12"/>;

        return (
            <Page>
                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn>
                        <h1>AtlasCode</h1>
                    </GridColumn>
                </Grid>

                <div className='sticky'>
                    <Grid spacing='comfortable' layout='fixed'>
                        <GridColumn medium={9}>
                            <h2>Settings</h2>
                        </GridColumn>
                    </Grid>
                </div>
                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn medium={9}>
                        <Collapsible transitionTime={30} 
                            trigger={Trigger('Authentication','configure authentication for Jira and Bitbucket')}
                            open={true}>
                            <h3>Jira</h3>
                            <ButtonGroup>
                            <Button className='ak-button' 
                                onClick={this.handleJiraLogin}>Authenticate</Button>
                            <Button className='ak-button' 
                                onClick={this.handleJiraLogout}>Logout</Button>
                            </ButtonGroup>
                            <h3>Bitbucket</h3>
                            <ButtonGroup>
                            <Button className='ak-button' 
                                onClick={this.handleBBLogin}>Authenticate</Button>
                            <Button className='ak-button' 
                                onClick={this.handleBBLogout}>Logout</Button>
                            </ButtonGroup>
                        </Collapsible>

                        <Collapsible transitionTime={30} 
                            trigger={Trigger('Issue Explorer','configure the Jira issue explorer')}
                            open={true}>
                            <JiraExplorer configData={this.state} onConfigChange={this.onConfigChange} />
                        </Collapsible>

                        <Collapsible transitionTime={30} 
                            trigger={Trigger('Pull Request Explorer','configure the Bitbucket pull request explorer')}
                            open={true}>
                            <BitbucketExplorer configData={this.state} onConfigChange={this.onConfigChange} />
                        </Collapsible>

                        <Collapsible transitionTime={30} 
                            trigger={Trigger('Status Bar','configure the status bar items for Jira and Bitbucket')}
                            open={true}>
                            <StatusBar configData={this.state} onConfigChange={this.onConfigChange} />
                        </Collapsible>
                    </GridColumn>
                    <GridColumn medium={3}>
                        <DisplayFeedback />
                        <div style={{ marginTop: '15px' }}>
                            <Button className='ak-link-button' appearance="link" iconBefore={bbicon} onClick={this.handleSourceLink}>Source Code</Button>
                            <Button className='ak-link-button' appearance="link" iconBefore={strideicon} onClick={this.handleHelpLink}>Need Help?</Button>
                        </div>
                    </GridColumn>
                </Grid>
            </Page>
        );
    }
}