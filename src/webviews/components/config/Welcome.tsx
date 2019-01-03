import * as React from 'react';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Button from '@atlaskit/button';
import { colors } from '@atlaskit/theme';
import DisplayFeedback from './DisplayFeedback';
import { Action } from '../../../ipc/messaging';
import { FeedbackData, SubmitFeedbackAction } from '../../../ipc/configActions';
import BitbucketIcon from '@atlaskit/logo/dist/esm/BitbucketLogo/Icon';
import JiraIcon from '@atlaskit/logo/dist/esm/JiraLogo/Icon';
import StrideIcon from '@atlaskit/logo/dist/esm/StrideLogo/Icon';
import PreferencesIcon from '@atlaskit/icon/glyph/preferences';
import { Spacer, InlineFlex } from '../styles';

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
        const bbicon = <BitbucketIcon size="small" iconColor={colors.B200} iconGradientStart={colors.B400} iconGradientStop={colors.B200} />;
        const strideicon = <StrideIcon size="small" iconColor={colors.B200} iconGradientStart={colors.B400} iconGradientStop={colors.B200} />;

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
                    <h3>🎉 What's New in 0.1.1 🎉</h3>
                        <section>
                            <h4><JiraIcon size="xsmall"/> Issue View</h4>
                            <ul>
                                <li>fixed: Webviews don't work properly in split view.</li>
                            </ul>
                        </section>
                        <section>
                            <h4><BitbucketIcon size="xsmall"/> Pull Request Explorer</h4>
                            <ul>
                                <li>show issues in BB explorer</li>
                                <li>map BB staging clone urls to BB client base url</li>
                                <li>Use diffstat instead of patch to get files changed in a PR</li>
                            </ul>
                        </section>
                        <section>
                            <h4><PreferencesIcon size="small" label="configuration"/> Configuration</h4>
                            <ul>
                                <li>experimental: Integrate JQL autocomplete input</li>
                                <li>experimental: Persist custom JQL for each site</li>
                            </ul>
                        </section>

                        <h3>🎉 What's New in 0.1.0 🎉</h3>
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
                            <h4><BitbucketIcon size="xsmall"/> Bitbucket Context Menus</h4>
                            <ul>
                                <li>right-click to get context menus that let you quickly navigate to specific code in Bitbucket or copy the url to the clipboard</li>
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