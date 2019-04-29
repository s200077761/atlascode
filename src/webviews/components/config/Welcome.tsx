import * as React from 'react';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Button, { ButtonGroup } from '@atlaskit/button';
import { colors } from '@atlaskit/theme';
import DisplayFeedback from './DisplayFeedback';
import { Action } from '../../../ipc/messaging';
import { FeedbackData, SubmitFeedbackAction } from '../../../ipc/configActions';
import BitbucketIcon from '@atlaskit/logo/dist/esm/BitbucketLogo/Icon';
import ConfluenceIcon from '@atlaskit/logo/dist/esm/ConfluenceLogo/Icon';
// import PreferencesIcon from '@atlaskit/icon/glyph/preferences';
// import IssuesIcon from '@atlaskit/icon/glyph/issues';
// import ArrowUpCircleIcon from '@atlaskit/icon/glyph/arrow-up-circle';

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

    handleIssueLink = () => {
        this.postMessage({ action: 'issueLink' });
    }

    handleDocsLink = () => {
        this.postMessage({ action: 'docsLink' });
    }

    handleFeedback = (feedback: FeedbackData) => {
        this.postMessage({ action: 'submitFeedback', feedback: feedback });
    }

    public render() {
        const bbicon = <BitbucketIcon size="small" iconColor={colors.B200} iconGradientStart={colors.B400} iconGradientStop={colors.B200} />;
        const connyicon = <ConfluenceIcon size="small" iconColor={colors.B200} iconGradientStart={colors.B400} iconGradientStop={colors.B200} />;

        return (
            <Page>
                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn>
                        <PageHeader><p>Welcome To Atlassian for VSCode!</p></PageHeader>
                        <ButtonGroup>
                            <Button className='ac-button' onClick={this.handleConfigure}>Configure Atlassian Settings</Button>
                            <DisplayFeedback onFeedback={this.handleFeedback} />
                            <Button className='ac-link-button' appearance="link" iconBefore={bbicon} onClick={this.handleSourceLink}>Source Code</Button>
                            <Button className='ac-link-button' appearance="link" iconBefore={bbicon} onClick={this.handleIssueLink}>Got Issues?</Button>
                            <Button className='ac-link-button' appearance="link" iconBefore={connyicon} onClick={this.handleDocsLink}>User Guide</Button>
                        </ButtonGroup>
                    </GridColumn>
                </Grid>

                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn medium={9}>
                        <h2>🎉 First Time Here? 🎉</h2>
                        <section>
                            <p>To get started, you'll need to authenticate with Jira and/or Bitbucket.</p>
                            <p>Use the 'Configure Atlassian Settings' button above to authenticate.</p>
                            <p>The configuration screen can also be used to completely customize the extension to fit your own workflow.</p>
                            <p>You can always get to the configuration screen by opening the command palette and typing 'Atlassian: Open Settings'</p>
                        </section>
                        <h2>🎉 What's New in 1.2.2 🎉</h2>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Extension works with <a href='https://developer.atlassian.com/cloud/bitbucket/bitbucket-api-changes-gdpr/'>Bitbucket's upcoming API changes</a> related to user privacy </li>
                                <li>Context menu item in treeviews to open in browser</li>
                                <li>Support to add an issue link when creating a Jira issue</li>
                            </ul>
                        </section>
                        <h2>🎉 What's New in 1.2.1 🎉</h2>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Added Jira issue links to Issue Details view</li>
                                <li>The configured development branch is now the default source when starting work on an issue</li>
                                <li>Added more default issue code link triggers</li>
                                <li>🐲 (experimental) bitbucket-pipelines.yml editing support</li>
                                <li>added external<Button className='ac-link-button' appearance="link" iconBefore={connyicon} onClick={this.handleDocsLink}>User Guide</Button></li>
                            </ul>
                        </section>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Mention names in pull request comments are not shown properly</li>
                                <li>Transition menu on start work page not working</li>
                                <li>PR create screen is not splitting the title and description correctly</li>
                            </ul>
                        </section>
                        <h2>🎉 What's New in 1.2.0 🎉</h2>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Start work from Bitbucket issue webview</li>
                                <li>Show additional information in Jira issue view (reporter, Bitbucket pull request status)</li>
                                <li>Add issue titles to Jira notifications</li>
                                <li>Option to close source branch after merge when creating pull request</li>
                                <li>Made pipelines header consistent with other webviews</li>
                                <li>Use new VS Code API for comments in pull requests</li>
                            </ul>
                        </section>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Long code blocks in Jira issues break out of their column</li>
                                <li>Markdown doesn't render in comments on Jira issues</li>
                                <li>Hovering on issue key to get details not working</li>
                                <li>Pipeline summary fails for in-progress builds</li>
                            </ul>
                        </section>
                        <h2>🎉 What's New in 1.1.0 🎉</h2>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Code hint to create issue from comment triggers</li>
                                <li>Add right-click create Jira issue in code view</li>
                                <li>Open Jira issue by key from command palette</li>
                                <li>Explorer for Bitbucket issues</li>
                                <li>Webview to create, view and update Bitbucket issues</li>
                                <li>Notifications for new Bitbucket issues</li>
                                <li>Show related Bitbucket issues in pull requests</li>
                                <li>Show recent Bitbucket pull requests for Jira issues</li>
                                <li>Improve issue created message when multiple issues are created one after another</li>
                                <li>Allow user to view logs from pipeline builds</li>
                                <li>Separate pipelines results by repo</li>
                                <li>Improve subtask display in treeviews to respect jql filter</li>
                                <li>Improvement and consistency for error messages in webviews</li>
                            </ul>
                        </section>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Welcome page opens on every new window</li>
                                <li>Pull request comments are being duplicated when treeview is refreshed</li>
                                <li>Fix auth timeout tab opening randomly sometimes</li>
                                <li>Handle cases when default site is not selected in settings screen</li>
                                <li>Filter out done issues in 'Your Issues' treeview</li>
                                <li>Fix pipelines result display with manual deployments</li>
                                <li>Jira issue details were not loading completely in some cases</li>
                            </ul>
                        </section>
                        <h2>🎉 What's New in 1.0.4 🎉</h2>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Fixed a bug where upstream branch was not being set properly when starting work on Jira issue</li>
                            </ul>
                        </section>
                        <h2>🎉 What's New in 1.0.3 🎉</h2>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Fixed another case causing extension to open an authentication browser tab occasionally without user interaction</li>
                            </ul>
                        </section>
                        <h2>🎉 What's New in 1.0.2 🎉</h2>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Extension opens an authentication browser tab occasionally without user interaction</li>
                                <li>Handle treeviews gracefully when there are no Bitbucket repos</li>
                                <li>Jira issue view shows blank page for some issues</li>
                                <li>Status bar settings are reset on restart</li>
                                <li>Checkboxes did not reflect correct state in settings page</li>
                            </ul>
                        </section>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Render markup for description for Jira issues</li>
                                <li>Group sub-tasks by parent issue in tree view</li>
                                <li>Show parent issue link for sub-tasks in jira details view</li>
                                <li>Improve styling on start work success message</li>
                                <li>Remove/disable start work button on issue screen if you're already on the issue branch</li>
                                <li>Moved site selector in settings to authorization section</li>
                                <li>Add site selector to the custom jql config screen</li>
                                <li>Support for default reviewers while creating pull requests</li>
                                <li>Detect dirty working tree and ask user to commit when creating PRs</li>
                            </ul>
                        </section>
                        <h2>🎉 What's New in 1.0.1 🎉</h2>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Extension occasionally opens up a browser window to auth until the user authenticates</li>
                                <li>General authentication fixes</li>
                                <li>Start work on issue hangs with non-Bitbucket repos</li>
                                <li>Custom JQL tree not refreshing when refresh button clicked</li>
                                <li>Length check causing View Issue page to dissappear</li>
                                <li>Pipelines explorer not initializing properly</li>
                                <li>Open in bitbucket context menu item not working on repository nodes</li>
                                <li>Create Pull Request hangs with non-Bitbucket Cloud repos</li>
                            </ul>
                        </section>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Add Project key to project selector list to dedupe project names</li>
                                <li>Add refresh button to custom JQL tree</li>
                            </ul>
                        </section>
                        <section>
                            <h2>Feedback</h2>
                            <p>We can only make this extension better with your help!</p>
                            <p>Make sure to let us know how we're doing by using the feedback buttons available on this screen and the configuration screen.</p>
                        </section>
                    </GridColumn>
                </Grid>
            </Page>
        );
    }
}
