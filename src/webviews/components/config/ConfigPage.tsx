import * as React from 'react';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import { emptyConfig, IConfig } from '../../../config/model';
import Collapsible from 'react-collapsible';
import { ButtonGroup } from '@atlaskit/button';
import Button from '@atlaskit/button';
import { AuthAction, SaveSettingsAction } from '../../../ipc/configActions';
import { AuthProvider } from '../../../atlclients/authInfo';
import JiraExplorer from './JiraExplorer';
import styled from 'styled-components';

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

type Emit = AuthAction | SaveSettingsAction;
export default class ConfigPage extends WebviewComponent<Emit, IConfig, {},IConfig> {
    constructor(props: any) {
        super(props);
        this.state = emptyConfig;
    }

    public onMessageReceived(e: IConfig) {
        console.log("got message from vscode", e);
        this.setState(e);
    }

    public onConfigChange = (change:changeObject) => {
        console.log('ConfigPage got change', change);

        this.postMessage({action:'saveSettings', changes:change});
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
    public render() {
        return (
            <Page>
                <Grid spacing='comfortable' layout='fluid'>
                    <GridColumn>
                        <h1>AtlasCode</h1>
                    </GridColumn>
                </Grid>

                <div className='sticky'>
                    <Grid spacing='comfortable' layout='fluid'>
                        <GridColumn medium={9}>
                            <h2>Settings</h2>
                        </GridColumn>
                    </Grid>
                </div>
                <Grid spacing='comfortable' layout='fluid'>
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
                            <JiraExplorer config={this.state} onConfigChange={this.onConfigChange} />
                        </Collapsible>

                        <Collapsible transitionTime={30} 
                            trigger={Trigger('Pull Request Explorer','configure the Bitbucket pull request explorer')}
                            open={true}>
                        </Collapsible>

                        <Collapsible transitionTime={30} 
                            trigger={Trigger('Status Bar','configure the status bar items for Jira and Bitbucket')}
                            open={true}>
                        </Collapsible>
                    </GridColumn>
                    <GridColumn medium={3}>sidebar</GridColumn>
                </Grid>
            </Page>
        );
    }
}