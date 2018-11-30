import * as React from 'react';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Button from '@atlaskit/button';
import DisplayFeedback from './DisplayFeedback';
import { Action } from '../../../ipc/messaging';
import { FeedbackData, SubmitFeedbackAction } from '../../../ipc/configActions';
import { InlineFlex } from './ConfigPage';
import { Spacer } from '../pullrequest/PullRequestPage';
import {JiraIcon, BitbucketIcon} from '@atlaskit/logo';
import PreferencesIcon from '@atlaskit/icon/glyph/preferences';

const bitbucketLogo:string =require('../images/bitbucket-logo.png');
const strideLogo:string =require('../images/stride-logo.png');

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

        const actionsContent =
            <InlineFlex>
                <Button className='ak-button' onClick={this.handleConfigure}>Configure Atlascode</Button>
                <Spacer><DisplayFeedback onFeedback={this.handleFeedback} /></Spacer>
                <Button className='ak-link-button' appearance="link" iconBefore={bbicon} onClick={this.handleSourceLink}>Source Code</Button>
                <Button className='ak-link-button' appearance="link" iconBefore={strideicon} onClick={this.handleHelpLink}>Need Help?</Button>
            </InlineFlex>;

        return (
            <Page>
                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn>
                        <PageHeader actions={actionsContent}><p>Welcome To AtlasCode!</p></PageHeader>
                    </GridColumn>
                </Grid>

                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn medium={9}>
                        <h3>🎉 What's New in 0.0.1 🎉</h3>
                        <section>
                            <h4><JiraIcon size="xsmall"/> Issue Explorer</h4>
                            <ul>
                                <li>shows a treeview of Jira Issues which open the issue view when clicked</li>
                            </ul>
                        </section>
                        <section>
                            <h4><JiraIcon size="xsmall"/> Issue View</h4>
                            <ul>
                                <li>shows the details of an issue and allows you to submit new comments and transition the issue</li>
                            </ul>
                        </section>
                        <section>
                            <h4><JiraIcon size="xsmall"/> Issue Hovers</h4>
                            <ul>
                                <li>hover over something that looks like an issue key in your source code to get the details</li>
                            </ul>
                        </section>
                        <section>
                            <h4><BitbucketIcon size="xsmall"/> Pull Request Explorer</h4>
                            <ul>
                                <li>shows a treeview of PRs for the Bitbucket cloud repos in the workspace which will open detail views when clicked</li>
                            </ul>
                        </section>
                        <section>
                            <h4><BitbucketIcon size="xsmall"/> Pull Request Details View</h4>
                            <ul>
                                <li>allows you to see the PR summary, checkout the PR branch, add comments, and approve the PR</li>
                            </ul>
                        </section>
                        <section>
                            <h4><BitbucketIcon size="xsmall"/> Pull Request Diff View</h4>
                            <ul>
                                <li>click on any file in the PR Explorer to get a diff view of the file as well as read and add comments</li>
                            </ul>
                        </section>
                        <section>
                            <h4><PreferencesIcon size="small" label="configuration"/> Configuration</h4>
                            <ul>
                                <li>a custom config screen is provider to authenticate with the Atlassian products as well as customize almost everything about the extension. You can get to it by looking for `Atlascode: Open Settings` in the command palette.</li>
                            </ul>
                        </section>
                    </GridColumn>
                </Grid>
            </Page>
        );
    }
}