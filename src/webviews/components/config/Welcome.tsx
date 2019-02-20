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
import PreferencesIcon from '@atlaskit/icon/glyph/preferences';
import IssuesIcon from '@atlaskit/icon/glyph/issues';
import ArrowUpCircleIcon from '@atlaskit/icon/glyph/arrow-up-circle';

type Emit = SubmitFeedbackAction | Action;
export default class WelcomePage extends WebviewComponent<Emit, {}, {}, {}> {
    constructor(props: any) {
        super(props);
    }

    public onMessageReceived(e: any) {

    }

    handleConfigure = () => {
        this.postMessage({ action: 'showConfigPage' });
    }

    handleSourceLink = () => {
        this.postMessage({ action: 'sourceLink' });
    }

    handleFeedback = (feedback: FeedbackData) => {
        this.postMessage({ action: 'submitFeedback', feedback: feedback });
    }

    public render() {
        const bbicon = <BitbucketIcon size="small" iconColor={colors.B200} iconGradientStart={colors.B400} iconGradientStop={colors.B200} />;

        const actionsContent =
            <div className='ac-flex-space-between'>
                <Button className='ac-button' onClick={this.handleConfigure}>Configure Atlascode</Button>
                <div className='ac-hmargin'><DisplayFeedback onFeedback={this.handleFeedback} /></div>
                <Button className='ac-link-button' appearance="link" iconBefore={bbicon} onClick={this.handleSourceLink}>Source Code</Button>
            </div>;

        return (
            <Page>
                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn>
                        <PageHeader actions={actionsContent}><p>Welcome To AtlasCode!</p></PageHeader>
                    </GridColumn>
                </Grid>

                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn medium={9}>
                        <h2>🎉 What's New in 0.2.0 🎉</h2>
                        <section>
                            <h4><BitbucketIcon size="xsmall" /> Pull Request Explorer</h4>
                            <ul>
                                <li>🔥 Added + button on title bar for creating new pull requests</li>
                            </ul>
                        </section>
                        <section>
                            <h4><BitbucketIcon size="xsmall" /> Bitbucket Context Menus</h4>
                            <ul>
                                <li>🔥 Added right+click context menu for creating new pull requests</li>
                            </ul>
                        </section>
                        <section>
                            <h4><BitbucketIcon size="xsmall" /> 🔥Create Pull Request View</h4>
                            <ul>
                                <li>Added a new screen for creating pull requests</li>
                                <li>Options to give the pull request a title and description before submitting</li>
                                <li>Validates source branch by comparing local/remote changes</li>
                                <li>Option to push local changes before submitting pull request</li>
                                <li>Links to the pull request tree view when a pull request is created</li>
                            </ul>
                        </section>
                        <section>
                            <h4><BitbucketIcon size="xsmall" /> Pull Request Details View</h4>
                            <ul>
                                <li><ArrowUpCircleIcon size="small" primaryColor="green" label="improvement" /> Now shows related issues on pull request details screen</li>
                            </ul>
                        </section>
                        <section>
                            <h4><JiraIcon size="xsmall" /> Issue View</h4>
                            <ul>
                                <li><ArrowUpCircleIcon size="small" primaryColor="green" label="improvement" /> Now shows related issues for epics on issue view screen</li>
                            </ul>
                        </section>
                        <section>
                            <h4><JiraIcon size="xsmall" /> Issue Explorer</h4>
                            <ul>
                                <li>🔥 Added custom JQL treeview</li>
                            </ul>
                        </section>
                        <section>
                            <h4><PreferencesIcon size="small" label="configuration" /> Configuration</h4>
                            <ul>
                                <li><ArrowUpCircleIcon size="small" primaryColor="green" label="improvement" /> added ability to configure jira auto-refresh time</li>
                                <li><ArrowUpCircleIcon size="small" primaryColor="green" label="improvement" /> added ability to configure bitbucket auto-refresh time</li>
                                <li><ArrowUpCircleIcon size="small" primaryColor="green" label="improvement" /> allow re-ordering of custom JQL queries</li>
                                <li><ArrowUpCircleIcon size="small" primaryColor="green" label="improvement" /> allow multiple custom JQL queries</li>
                                <li><ArrowUpCircleIcon size="small" primaryColor="green" label="improvement" /> allow re-ordering of custom JQL queries</li>
                                <li>🔥 Update Jira explorer when custom JQL is updated</li>
                            </ul>
                        </section>
                        <section>
                            <h4><IssuesIcon size="small" label="miscellaneous" /> Miscellaneous</h4>
                            <ul>
                                <li><ArrowUpCircleIcon size="small" primaryColor="green" label="improvement" /> Quick pick dropdown for selecting Jira project now allows searching all projects</li>
                                <li><ArrowUpCircleIcon size="small" primaryColor="green" label="improvement" /> Added popup notification when new pull requests are detected</li>
                                <li><ArrowUpCircleIcon size="small" primaryColor="green" label="improvement" /> Use the new VS Code clipboard API instead of the library we're using for copying things</li>
                            </ul>
                        </section>
                        <h2>🎉 What's New in 0.1.1 🎉</h2>
                        <section>
                            <h4><JiraIcon size="xsmall" /> Issue View</h4>
                            <ul>
                                <li>fixed: Webviews don't work properly in split view.</li>
                            </ul>
                        </section>
                        <section>
                            <h4><BitbucketIcon size="xsmall" /> Pull Request Explorer</h4>
                            <ul>
                                <li>show issues in BB explorer</li>
                                <li>map BB staging clone urls to BB client base url</li>
                                <li>Use diffstat instead of patch to get files changed in a PR</li>
                            </ul>
                        </section>
                        <section>
                            <h4><PreferencesIcon size="small" label="configuration" /> Configuration</h4>
                            <ul>
                                <li>experimental: Integrate JQL autocomplete input</li>
                                <li>experimental: Persist custom JQL for each site</li>
                            </ul>
                        </section>

                        <h3>🎉 What's New in 0.1.0 🎉</h3>
                        <section>
                            <h4><JiraIcon size="xsmall" /> Issue Explorer</h4>
                            <ul>
                                <li>shows a treeview of Jira Issues which open the issue view when clicked</li>
                            </ul>
                        </section>
                        <section>
                            <h4><JiraIcon size="xsmall" /> Issue View</h4>
                            <ul>
                                <li>shows the details of an issue and allows you to submit new comments and transition the issue</li>
                            </ul>
                        </section>
                        <section>
                            <h4><JiraIcon size="xsmall" /> Issue Hovers</h4>
                            <ul>
                                <li>hover over something that looks like an issue key in your source code to get the details</li>
                            </ul>
                        </section>
                        <section>
                            <h4><BitbucketIcon size="xsmall" /> Pull Request Explorer</h4>
                            <ul>
                                <li>shows a treeview of PRs for the Bitbucket cloud repos in the workspace which will open detail views when clicked</li>
                            </ul>
                        </section>
                        <section>
                            <h4><BitbucketIcon size="xsmall" /> Pull Request Details View</h4>
                            <ul>
                                <li>allows you to see the PR summary, checkout the PR branch, add comments, and approve the PR</li>
                            </ul>
                        </section>
                        <section>
                            <h4><BitbucketIcon size="xsmall" /> Pull Request Diff View</h4>
                            <ul>
                                <li>click on any file in the PR Explorer to get a diff view of the file as well as read and add comments</li>
                            </ul>
                        </section>
                        <section>
                            <h4><BitbucketIcon size="xsmall" /> Bitbucket Context Menus</h4>
                            <ul>
                                <li>right-click to get context menus that let you quickly navigate to specific code in Bitbucket or copy the url to the clipboard</li>
                            </ul>
                        </section>
                        <section>
                            <h4><PreferencesIcon size="small" label="configuration" /> Configuration</h4>
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
