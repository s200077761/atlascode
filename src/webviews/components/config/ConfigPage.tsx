import * as React from 'react';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Collapsible from 'react-collapsible';
import Button from '@atlaskit/button';
import { AuthAction, SaveSettingsAction, FeedbackData, SubmitFeedbackAction } from '../../../ipc/configActions';
import { AuthProvider } from '../../../atlclients/authInfo';
import JiraExplorer from './JiraExplorer';
import styled from 'styled-components';
import { ConfigData, emptyConfigData } from '../../../ipc/configMessaging';
import BitbucketExplorer from './BBExplorer';
import StatusBar from './StatusBar';
import DisplayFeedback from './DisplayFeedback';
import { Action } from '../../../ipc/messaging';
import JiraHover from './JiraHover';
import BitbucketContextMenus from './BBContextMenus';
import WelcomeConfig from './WelcomeConfig';
import CustomJQL from './CustomJQL';

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
  
type Emit = AuthAction | SaveSettingsAction | SubmitFeedbackAction | Action;
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

    handleFeedback = (feedback:FeedbackData) => {
        this.postMessage({action:'submitFeedback', feedback:feedback});
    }

    private jiraButton():any {
        if (this.state.isJiraAuthenticated) {
            return(<Button className='ak-button' 
                onClick={this.handleJiraLogout}>Logout</Button>);
        } else {
            return (<Button className='ak-button' 
                onClick={this.handleJiraLogin}>Authenticate</Button>);
        }
    }

    private bitBucketButton():any {
        if (this.state.isBitbucketAuthenticated) {
            return( <Button className='ak-button' 
                onClick={this.handleBBLogout}>Logout</Button>);
        } else {
            return (<Button className='ak-button' 
                onClick={this.handleBBLogin}>Authenticate</Button>);
        }
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
                            {this.jiraButton()}
                            <p>to authenticate with a new Jira working site log out of your current site and log in to the new site</p>
                            <h3>Bitbucket</h3>
                            {this.bitBucketButton()}
                            </Collapsible>

                        <Collapsible transitionTime={30} 
                            trigger={Trigger('Issue Explorer','configure the Jira issue explorer')}
                            open={true}>
                            <JiraExplorer configData={this.state} onConfigChange={this.onConfigChange} />
                        </Collapsible>

                        <Collapsible transitionTime={30} 
                            trigger={Trigger('Jira Hover Provider','configure the hover provider for Jira issues')}
                            open={true}>
                            <JiraHover configData={this.state} onConfigChange={this.onConfigChange} />
                        </Collapsible>

                        <Collapsible transitionTime={30} 
                            trigger={Trigger('Pull Request Explorer','configure the Bitbucket pull request explorer')}
                            open={true}>
                            <BitbucketExplorer configData={this.state} onConfigChange={this.onConfigChange} />
                            <CustomJQL inputId="" cloudId = {this.state.config.jira.workingSite.id} jiraAccessToken = {this.state.jiraAccessToken} />
                        </Collapsible>

                        <Collapsible transitionTime={30} 
                            trigger={Trigger('Bitbucket Context Menus','configure the Bitbucket context menus in editor')}
                            open={true}>
                            <BitbucketContextMenus configData={this.state} onConfigChange={this.onConfigChange} />
                        </Collapsible>

                        <Collapsible transitionTime={30} 
                            trigger={Trigger('Status Bar','configure the status bar items for Jira and Bitbucket')}
                            open={true}>
                            <StatusBar configData={this.state} onConfigChange={this.onConfigChange} />
                        </Collapsible>

                        <Collapsible transitionTime={30} 
                            trigger={Trigger('','miscellaneous settings')}
                            open={true}>
                            <WelcomeConfig configData={this.state} onConfigChange={this.onConfigChange} />
                        </Collapsible>
                    </GridColumn>
                    <GridColumn medium={3}>
                        <DisplayFeedback onFeedback={this.handleFeedback} />
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
