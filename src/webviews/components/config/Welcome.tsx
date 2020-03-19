import Button from '@atlaskit/button';
import { BitbucketIcon, ConfluenceIcon } from '@atlaskit/logo';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import { colors } from '@atlaskit/theme';
import * as React from 'react';
import Collapsible from 'react-collapsible';
import { FeedbackData, SubmitFeedbackAction } from '../../../ipc/configActions';
import { FeedbackUser } from '../../../ipc/configMessaging';
import { Action } from '../../../ipc/messaging';
import { WebviewComponent } from '../WebviewComponent';
import DisplayFeedback from './DisplayFeedback';

type ViewState = {
    feedbackUser: FeedbackUser;
};

type Emit = SubmitFeedbackAction | Action;
export default class WelcomePage extends WebviewComponent<Emit, {}, {}, ViewState> {
    constructor(props: any) {
        super(props);
        this.state = {
            feedbackUser: { userName: '', emailAddress: '' }
        };
    }

    public onMessageReceived(e: any): boolean {
        switch (e.type) {
            case 'update': {
                this.setState({ feedbackUser: e.feedbackUser });
                break;
            }
        }

        return true;
    }

    handleConfigure = () => {
        this.postMessage({ action: 'showConfigPage' });
    };

    handleSourceLink = () => {
        this.postMessage({ action: 'sourceLink' });
    };

    handleIssueLink = () => {
        this.postMessage({ action: 'issueLink' });
    };

    handleDocsLink = () => {
        this.postMessage({ action: 'docsLink' });
    };

    handleFeedback = (feedback: FeedbackData) => {
        this.postMessage({ action: 'submitFeedback', feedback: feedback });
    };

    public render() {
        const bbicon = (
            <BitbucketIcon
                size="small"
                iconColor={colors.B200}
                iconGradientStart={colors.B400}
                iconGradientStop={colors.B200}
            />
        );
        const connyicon = (
            <ConfluenceIcon
                size="small"
                iconColor={colors.B200}
                iconGradientStart={colors.B400}
                iconGradientStop={colors.B200}
            />
        );

        return (
            <Page>
                <Grid spacing="comfortable" layout="fixed">
                    <GridColumn medium={12}>
                        <PageHeader>
                            <p>Welcome To Atlassian for VS Code!</p>
                        </PageHeader>
                    </GridColumn>
                    <GridColumn medium={9}>
                        <h3>🎉 First Time Here? 🎉</h3>
                        <section>
                            <div>
                                <p>
                                    To get started, you'll need to authenticate with Jira and/or Bitbucket from the
                                    configuration screen
                                </p>
                                <p>
                                    click the <em>Configure Atlassian Settings</em> to access the configuration 👉
                                </p>
                                <p>
                                    The configuration screen can also be used to completely customize the extension to
                                    fit your own workflow.
                                </p>
                                <p>
                                    You can always get to the configuration screen by opening the command palette and
                                    typing 'Atlassian: Open Settings'
                                </p>
                            </div>
                        </section>
                        <h3>🎉 What's New in 2.4.10 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Pull Request descriptions can now be edited</li>
                                <li>Jira mentions are now supported from the issue description</li>
                                <li>Tab titles have been shortened for Jira/Bitbucket issues and favicons now vary</li>
                                <li>
                                    Remote branches can now be selected as the source branch on the "Start work on
                                    Issue" page
                                </li>
                                <li>
                                    Pipelines can now be re-run from the Pipelines sidebar or the result summary page
                                </li>
                                <li>The start-up time of this extension has been sped up</li>
                                <li>
                                    You can now start a Bitbucket Pipeline for any branch. Just open the command palette
                                    and select “Run Pipeline for Branch”
                                </li>
                            </ul>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Subtasks are no longer excluded from grouped JQL results</li>
                                <li>Autogenerated PR titles were made consistent with Bitbucket site</li>
                                <li>Bitbucket sites can now be edited</li>
                                <li>Status bar no longer shows invalid issues</li>
                                <li>Editing an empty issue description no longer causes a rendering failure</li>
                                <li>Non-American style dates are now displayed correctly</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.4.9 🎉</h3>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Fixed a bug in extension build</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.4.7 🎉</h3>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Fixed loop that could cause infinite credential refreshing in the background</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.4.6 🎉</h3>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Pull Request preloading has been reverted to avoid rate-limiting issues</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.4.4 🎉</h3>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Fixed a bug in extension build</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.4.3 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>
                                    If there's only one related issue, don't make the user expand the "Related issues"
                                    section
                                </li>
                                <li>Edit Jira issue descriptions</li>
                                <li>Added "Configure filters..." button below JQL filters in tree</li>
                                <li>Pull build status for Bitbucket Server</li>
                                <li>Exposed Jira issue results search via command palette</li>
                                <li>Improved PR Speed</li>
                                <li>Allow user to change password for server sites</li>
                                <li>Preload PR data</li>
                                <li>Stopped notifying users when URLs are copied to clipboard</li>
                                <li>Added repository name to pipeline messages</li>
                                <li>Show active Jira issue in status bar</li>
                            </ul>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Jira issue webviews don't render well when narrow</li>
                                <li>Long branch names in PRs are not entirely visible</li>
                                <li>Merge Dialog not Readable with Dark Theme (High Contrast)</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.4.2 🎉</h3>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Fixed certificate handling when adding new Jira sites</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.4.1 🎉</h3>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Fix certificate handling for Jira clients</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.4.0 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Jira explorer shows issue count for each JQL entry</li>
                                <li>Added ability to search for issues in the Jira explorer</li>
                                <li>Support mentioning users in Jira issue comments</li>
                                <li>
                                    Added context menu and toolbar options in pull request diff view to open the file in
                                    a new tab for editing
                                </li>
                                <li>Support adding reviewers to existing pull requests</li>
                                <li>Support creating Bitbucket issue to parent repo when working on its fork</li>
                                <li>Improved support for assigning Bitbucket issues</li>
                            </ul>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Worklog comment is optional now</li>
                                <li>Fixed formatting Jira issues in comments</li>
                                <li>Fixed pull request merge message not being updated when approval changes</li>
                                <li>
                                    Fixed pull request and start work screens staying permanently in loading state in
                                    some cases
                                </li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.3.2 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Updated README to include complete build instructions</li>
                                <li>Improved reviewer/mention selection for Bitbucket Cloud pull requests</li>
                                <li>It is now possible to reply to any pull request comment in the diff view</li>
                            </ul>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Matched cursor behavior in diff lists to the Bitbucket Cloud website</li>
                                <li>Cancelled tasks are now hidden and task deletion doesn't cause strange behavior</li>
                                <li>
                                    You can now add pull-request-level tasks in Bitbucket Cloud pull requests even when
                                    no tasks already exist
                                </li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.3.1 🎉</h3>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Start work on issue now works correctly again</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.3.0 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Added support for Bitbucket tasks</li>
                                <li>Can now edit both time and date when adding a worklog</li>
                                <li>
                                    Added buttons to create Jira and Bitbucket issues and pull requests to trees in side
                                    bar
                                </li>
                                <li>Reduced number of Bitbucket API requests to reduce rate-limit errors</li>
                                <li>Preserve file structure when showing pull request contents in the side bar</li>
                                <li>Default maximum number of Jira issues fetched via JQL increased from 50 to 100</li>
                                <li>Added option to fetch all issues matching JQL</li>
                                <li>Made settings titles consistent</li>
                                <li>
                                    Now have different messages in sidebar when not authenticated with Bitbucket and not
                                    having a Bitbucket repo available in the current workspace
                                </li>
                                <li>
                                    When adding a new Jira site default JQL for that site will now contain{' '}
                                    <code>resolution = Unresolved</code> if the site is configured to support the{' '}
                                    <code>resolution</code> field
                                </li>
                                <li>Added support for pull requests from forks</li>
                                <li>Default reviewers are now prepopulated for pull requests from forks</li>
                            </ul>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Fixed link to "Select merge strategy" when merging a pull request</li>
                                <li>
                                    Code blocks in diff-view comments now contain proper highlighting and special
                                    characters aren’t escaped
                                </li>
                                <li>
                                    Fixed issue that prevented using Jira and Bitbucket instances on the same host (for
                                    real this time)
                                </li>
                                <li>Comment order is now preserved after making a comment on Bitbucket Server</li>
                                <li>Made "Needs work" button more readable when using a dark theme</li>
                                <li>Can now log work on Jira Server</li>
                                <li>Project list is now searchable when creating an issue on Bitbucket Server</li>
                                <li>Fixed issue that could cause viewing files in pull requests to be slow</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.2.1 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>
                                    Added “Group issues by Epic” option to display issues in a list instead of nesting
                                    subtasks under issues and issues under Epics
                                </li>
                            </ul>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Fixed bug where special characters were being escaped in the status bar</li>
                                <li>Fixed authenticating with multi-level context paths</li>
                                <li>Fixed bugs causing subtasks not matching query to be included in JQL results</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.2.0 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Support for importing Jira filters when adding custom JQL entries</li>
                                <li>Support editing pull request titles</li>
                                <li>Support for custom online check URLs</li>
                            </ul>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>
                                    Fixed bug where extension does not work when Jira and Bitbucket are set up with the
                                    same domain
                                </li>
                                <li>Fixed bug where last used Jira project for creating issues was not being saved</li>
                                <li>Fixed bug where Jira autocomplete query was not being encoded correctly</li>
                                <li>Fixed bug causing internal comment button to not show up on service desk issues</li>
                                <li>Fixed bug preventing creation of Bitbucket issues</li>
                                <li>
                                    Fixed bug where create pull request view kept spinning when no repositories were
                                    open
                                </li>
                                <li>
                                    Fixed issue where Jira issues show in treeview but open a blank screen when opened
                                </li>
                                <li>Restrict inline commenting range for Bitbucket Server pull requests</li>
                                <li>Fixed delay when refreshing pull requests treeview</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.1.5 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Added welcome screen to help new users get up and running</li>
                                <li>Support using existing branches when starting work on an issue</li>
                            </ul>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Fixed issue that could prevent Windows users from adding multiple accounts</li>
                                <li>
                                    Allow disabling Jira or Bitbucket features globally and re-enabling them at the
                                    project level
                                </li>
                                <li>
                                    Inline comments on Bitbucket Server pull requests no longer show up at the file
                                    level
                                </li>
                                <li>Fixed diff view comments not refreshing after adding a new comment</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.1.4 🎉</h3>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Fixed issue that resulted in failure to save credentials when logging in</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.1.3 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>
                                    Added tooltip text clarifying that only exact matches are allowed on Bitbucket
                                    Server when adding reviewers to a pull request
                                </li>
                                <li>
                                    When available, specific error messages for git operations are now presented instead
                                    of more general error messages
                                </li>
                            </ul>
                        </section>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Jira issues are now correctly assigned when using start work on Jira Server</li>
                                <li>
                                    Selecting an item from the mention picker when editing a Bitbucket issue now works
                                    correctly
                                </li>
                                <li>
                                    "Create in browser..." button on "Create pull request" screen now links to correct
                                    location on Bitbucket Server
                                </li>
                                <li>Fixed bug that could prevent Jira issues from presenting up-to-date information</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.1.2 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Allow extension to be used when working in remote workspaces</li>
                                <li>Support for adding internal comments on Jira Service Desk issues</li>
                            </ul>
                        </section>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Jira issue status was empty in some cases</li>
                                <li>Jira issues showed duplicate transition states in some cases</li>
                                <li>Adding reviewers on Bitbucket Cloud pull requests would show an error</li>
                                <li>Code blocks in inline comments were not formatted correctly</li>
                                <li>Bitbucket issue creation was failing</li>
                                <li>Bitbucket issue sidebar styling was inconsistent</li>
                                <li>Fixed copy for creating pull request externally</li>
                                <li>Fixed link to prepare-commit-message snippet</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.1.1 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Added support for tunneling https when using a proxy server</li>
                                <li>Now using a reasonable placeholder for broken images</li>
                            </ul>
                        </section>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Jira issue screen broken due to missing priority field</li>
                                <li>Jira issue screen broken due to missing subtasks field</li>
                                <li>Bitbucket repos not recognized if remote URL includes a port</li>
                                <li>Bitbucket start work on issue not working</li>
                                <li>Code block in comments too dark to see in dark themes</li>
                                <li>Pipelines explorer filters not working properly</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.1.0 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Clicking on a pull request preview file now opens the file</li>
                                <li>Added advanced SSL options to custom login screen</li>
                                <li>Added context path option to custom login screen</li>
                                <li>Now showing PR approval status in explorer tooltip</li>
                            </ul>
                        </section>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Bitbucket pull request filters not working</li>
                                <li>Sometimes issue screen would be blank</li>
                                <li>Online/Offline checker sometimes gave wrong results</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.0.4 🎉</h3>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Some Jira fields not populating due to invalid field keys</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.0.3 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Removed the file changes count limit for pull requests</li>
                                <li>Webview tabs now have an Atlassian icon</li>
                            </ul>
                        </section>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Create Issue page not loading in some instances</li>
                                <li>Webviews didn't allow images to load over http</li>
                                <li>Various undefined values would throw errors due to lack of boundry checking</li>
                                <li>Doc links fixed and various spelling corrections</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.0.1 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Added support for plain http when connecting to server instances</li>
                                <li>
                                    Added experimental support for self-signed certificates see:{' '}
                                    <a href="https://bitbucket.org/atlassianlabs/atlascode/issues/201">Issue #201</a>
                                </li>
                            </ul>
                        </section>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Fixed Bitbucket authentication not working</li>
                            </ul>
                        </section>
                        <h3>🎉 What's New in 2.0.0 🎉</h3>
                        <section>
                            <h4>✨ Improvements ✨</h4>
                            <ul>
                                <li>Support for Jira Server and Bitbucket Server</li>
                                <li>Support for a wider range of Jira features and configurations</li>
                                <ul>
                                    <li>Time tracking</li>
                                    <li>Adding sprints to issues</li>
                                    <li>Not having a resolution field</li>
                                    <li>And more!</li>
                                </ul>
                                <li>View JQL from multiple sites at once in Jira explorer</li>
                                <li>Improved Settings</li>
                                <ul>
                                    <li>Jira and Bitbucket now have their own sections in the settings</li>
                                    <li>Jira or Bitbucket features can now be completely disabled</li>
                                    <li>Settings can now be saved at either the user level or the workspace level</li>
                                </ul>
                                <li>Notifications can be managed and disabled for individual JQL queries</li>
                                <li>Can now collapse all comments on a pull request</li>
                                <li>
                                    Selected code will now be included in description when creating issue from a TODO
                                </li>
                                <li>Get the latest information by refreshing any webview</li>
                                <li>Improved performance when creating pull requests or starting work on issues</li>
                                <li>Easily edit the branch name when starting work on an issue</li>
                                <li>Pre-filled mention picker when creating pull requests and Bitbucket issues</li>
                                <li>Editing and deleting comments in pull requests</li>
                                <li>Added support for merge commit messages</li>
                                <li>Added diff preview in pull request views</li>
                                <li>Added support for Bitbucket mirrors</li>
                            </ul>
                        </section>
                        <section>
                            <h4>🐞 Bugs Fixed 🐞</h4>
                            <ul>
                                <li>Build statuses now link to the tool that created them</li>
                                <li>Fixed URL creation on Windows</li>
                                <li>
                                    <code>TODO</code> triggers no longer require a trailing space
                                </li>
                                <li>Subtasks now report the correct status</li>
                                <li>
                                    Pipelines builds triggered manually or by tag creation now show up in the pipelines
                                    side bar
                                </li>
                                <li>Username was not slugified when making calls during Bitbucket server auth flow</li>
                                <li>Sometimes webviews would not load data</li>
                                <li>
                                    Transitions are now reloaded when an issue is transitioned to get any new available
                                    options
                                </li>
                                <li>Fixed bad default JQL in settings.json</li>
                                <li>Fixed error when checking for an empty user object</li>
                                <li>Fixed issue with credentials not saving for all sites</li>
                            </ul>
                        </section>
                        <div className="ac-vpadding">
                            <Collapsible
                                trigger="► Show previous"
                                triggerWhenOpen="▼ Show previous"
                                triggerClassName="ac-collapsible-trigger"
                                triggerOpenedClassName="ac-collapsible-trigger"
                                triggerTagName="label"
                                easing="ease-out"
                                transitionTime={150}
                                overflowWhenOpen="visible"
                            >
                                <h3>🎉 What's New in 1.4.3 🎉</h3>
                                <section>
                                    <h4>✨ Improvements ✨</h4>
                                    <ul>
                                        <li>Show Jira issue key in explorer</li>
                                    </ul>
                                </section>
                                <section>
                                    <h4>🐞 Bugs Fixed 🐞</h4>
                                    <ul>
                                        <li>Webviews show loading message when they come to focus</li>
                                        <li>Jira issue created notifications do not show up sometimes</li>
                                    </ul>
                                </section>

                                <h3>🎉 What's New in 1.4.2 🎉</h3>
                                <section>
                                    <h4>✨ Improvements ✨</h4>
                                    <ul>
                                        <li>Allow using currentProject() in custom jql</li>
                                        <li>Make Your/Open Issues editable custom JQL entries</li>
                                    </ul>
                                </section>
                                <section>
                                    <h4>🐞 Bugs Fixed 🐞</h4>
                                    <ul>
                                        <li>Comment API changes for VS Code May Updates</li>
                                    </ul>
                                </section>
                                <h3>🎉 What's New in 1.4.1 🎉</h3>
                                <section>
                                    <h4>✨ Improvements ✨</h4>
                                    <ul>
                                        <li>Updated marketplace listing name to feature Jira and Bitbucket</li>
                                        <li>Add ability to modify a subset of fields on Jira details screen</li>
                                    </ul>
                                </section>
                                <section>
                                    <h4>🐞 Bugs Fixed 🐞</h4>
                                    <ul>
                                        <li>Panel text colours appear washed out in Jira webview</li>
                                    </ul>
                                </section>
                                <h3>🎉 What's New in 1.4.0 🎉</h3>
                                <section>
                                    <h4>✨ Improvements ✨</h4>
                                    <ul>
                                        <li>Store Jira working project as workspace config if possible</li>
                                        <li>Update assignee in Jira issue view</li>
                                        <li>Show conflicted state for a pull request file in tree view</li>
                                        <li>Show merge checklist before merging</li>
                                        <li>Reduce number of git calls for better performance on large PRs</li>
                                        <li>Better emoji styling in pull request webview</li>
                                        <li>Add loading indicator when posting comment on webviews</li>
                                        <li>Ticket comments should include date/time metadata</li>
                                        <li>Allow filtering of pipelines</li>
                                        <li>Make Bitbucket features work with SSH aliases</li>
                                        <li>Bitbucket features work with repositories cloned with https protocol</li>
                                        <li>Better date format on pull request commit list</li>
                                        <li>Update to latest VS Code comments api</li>
                                        <li>Offline detection is too aggressive</li>
                                        <li>Use Atlassian urls for online checks</li>
                                        <li>Authentication related fixes and improvements</li>
                                    </ul>
                                </section>
                                <section>
                                    <h4>🐞 Bugs Fixed 🐞</h4>
                                    <ul>
                                        <li>Epic fields are being duplicated in Jira API requests</li>
                                        <li>Other issues from the same epic showing up in JQL results</li>
                                        <li>Checkout source branch button doesn't update correctly</li>
                                        <li>Pull requests with large number of files do not work properly</li>
                                        <li>
                                            Large pull requests spawn large number of git/console host processes on
                                            refresh/comment change
                                        </li>
                                        <li>PR comments disappearing after some time</li>
                                        <li>Unable to start pipeline from explorer</li>
                                    </ul>
                                </section>
                                <h3>🎉 What's New in 1.3.1 🎉</h3>
                                <section>
                                    <h4>🐞 Bugs Fixed 🐞</h4>
                                    <ul>
                                        <li>Cannot create Jira issues in certain cases if epic is not specified</li>
                                        <li>Jira treeviews show no issues after some time</li>
                                    </ul>
                                </section>
                                <h3>🎉 What's New in 1.3.0 🎉</h3>
                                <section>
                                    <h4>✨ Improvements ✨</h4>
                                    <ul>
                                        <li> Now using port 31415 for auth listener instead of 9090</li>
                                        <li> Added custom prefix for branches when starting work on issue</li>
                                        <li> Added Jira epics in issue details view</li>
                                        <li> Added ability to link to an epic on Jira create issue</li>
                                        <li> It's now possible to create an Epic issue</li>
                                        <li>
                                            {' '}
                                            Merge actions similar to Bitbucket webpage (merge type/close source branch
                                            etc)
                                        </li>
                                        <li>
                                            {' '}
                                            Option to transition Jira/Bitbucket issue when creating/merging pull
                                            requests
                                        </li>
                                        <li> Support for creating issue-links on Jira create screen</li>
                                        <li>
                                            {' '}
                                            Added related issues and transition option to create pull request screen
                                        </li>
                                        <li> Now showing better messaging when no Bitbucket project is open</li>
                                        <li> Show merge conflicts in pull request treeview</li>
                                        <li> Added non-renderable field warnings and report for Jira create issue</li>
                                        <li>
                                            {' '}
                                            Added ability to create a Jira issue from a Bitbucket issue and link them
                                        </li>
                                        <li> Ensure webview controllers don't refresh multiple times at once</li>
                                    </ul>
                                </section>
                                <section>
                                    <h4>🐞 Bugs Fixed 🐞</h4>
                                    <ul>
                                        <li> Transition menu in start work on issue does not work</li>
                                        <li> Pull request merge fails silently when there are conflicts</li>
                                        <li>
                                            Create pull request screen shows blank page when remote branch is deleted
                                        </li>
                                    </ul>
                                </section>
                                <h3>🎉 What's New in 1.2.3 🎉</h3>
                                <section>
                                    <h4>🐞 Bugs Fixed 🐞</h4>
                                    <ul>
                                        <li>JQL error when opening related Jira issues in the pull request tree</li>
                                    </ul>
                                </section>
                                <h3>🎉 What's New in 1.2.2 🎉</h3>
                                <section>
                                    <h4>✨ Improvements ✨</h4>
                                    <ul>
                                        <li>
                                            Extension works with{' '}
                                            <a href="https://developer.atlassian.com/cloud/bitbucket/bitbucket-api-changes-gdpr/">
                                                Bitbucket's upcoming API changes
                                            </a>{' '}
                                            related to user privacy{' '}
                                        </li>
                                        <li>Context menu item in treeviews to open in browser</li>
                                        <li>Support to add an issue link when creating a Jira issue</li>
                                    </ul>
                                </section>
                                <h3>🎉 What's New in 1.2.1 🎉</h3>
                                <section>
                                    <h4>✨ Improvements ✨</h4>
                                    <ul>
                                        <li>Added Jira issue links to Issue Details view</li>
                                        <li>
                                            The configured development branch is now the default source when starting
                                            work on an issue
                                        </li>
                                        <li>Added more default issue code link triggers</li>
                                        <li>🐲 (experimental) bitbucket-pipelines.yml editing support</li>
                                        <li>
                                            added external
                                            <Button
                                                className="ac-link-button"
                                                appearance="link"
                                                iconBefore={connyicon}
                                                onClick={this.handleDocsLink}
                                            >
                                                User Guide
                                            </Button>
                                        </li>
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
                                <h3>🎉 What's New in 1.2.0 🎉</h3>
                                <section>
                                    <h4>✨ Improvements ✨</h4>
                                    <ul>
                                        <li>Start work from Bitbucket issue webview</li>
                                        <li>
                                            Show additional information in Jira issue view (reporter, Bitbucket pull
                                            request status)
                                        </li>
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
                                <h3>🎉 What's New in 1.1.0 🎉</h3>
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
                                        <li>
                                            Improve issue created message when multiple issues are created one after
                                            another
                                        </li>
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
                                <h3>🎉 What's New in 1.0.4 🎉</h3>
                                <section>
                                    <h4>🐞 Bugs Fixed 🐞</h4>
                                    <ul>
                                        <li>
                                            Fixed a bug where upstream branch was not being set properly when starting
                                            work on Jira issue
                                        </li>
                                    </ul>
                                </section>
                                <h3>🎉 What's New in 1.0.3 🎉</h3>
                                <section>
                                    <h4>🐞 Bugs Fixed 🐞</h4>
                                    <ul>
                                        <li>
                                            Fixed another case causing extension to open an authentication browser tab
                                            occasionally without user interaction
                                        </li>
                                    </ul>
                                </section>
                                <h3>🎉 What's New in 1.0.2 🎉</h3>
                                <section>
                                    <h4>🐞 Bugs Fixed 🐞</h4>
                                    <ul>
                                        <li>
                                            Extension opens an authentication browser tab occasionally without user
                                            interaction
                                        </li>
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
                                        <li>Show parent issue link for sub-tasks in Jira details view</li>
                                        <li>Improve styling on start work success message</li>
                                        <li>
                                            Remove/disable start work button on issue screen if you're already on the
                                            issue branch
                                        </li>
                                        <li>Moved site selector in settings to authorization section</li>
                                        <li>Add site selector to the custom jql config screen</li>
                                        <li>Support for default reviewers while creating pull requests</li>
                                        <li>Detect dirty working tree and ask user to commit when creating PRs</li>
                                    </ul>
                                </section>
                                <h3>🎉 What's New in 1.0.1 🎉</h3>
                                <section>
                                    <h4>🐞 Bugs Fixed 🐞</h4>
                                    <ul>
                                        <li>
                                            Extension occasionally opens up a browser window to auth until the user
                                            authenticates
                                        </li>
                                        <li>General authentication fixes</li>
                                        <li>Start work on issue hangs with non-Bitbucket repos</li>
                                        <li>Custom JQL tree not refreshing when refresh button clicked</li>
                                        <li>Length check causing View Issue page to disappear</li>
                                        <li>Pipelines explorer not initializing properly</li>
                                        <li>Open in Bitbucket context menu item not working on repository nodes</li>
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
                            </Collapsible>
                        </div>
                        <section>
                            <h3>Feedback</h3>
                            <p>We can only make this extension better with your help!</p>
                            <p>
                                Make sure to let us know how we're doing by using the feedback buttons available on this
                                screen and the configuration screen.
                            </p>
                        </section>
                    </GridColumn>
                    <GridColumn medium={3}>
                        <Button className="ac-button" onClick={this.handleConfigure}>
                            Configure Atlassian Settings
                        </Button>
                        <div className="ac-vpadding">
                            <DisplayFeedback userDetails={this.state.feedbackUser} onFeedback={this.handleFeedback} />
                        </div>
                        <Button
                            className="ac-link-button"
                            appearance="link"
                            iconBefore={bbicon}
                            onClick={this.handleSourceLink}
                        >
                            Source Code
                        </Button>
                        <Button
                            className="ac-link-button"
                            appearance="link"
                            iconBefore={bbicon}
                            onClick={this.handleIssueLink}
                        >
                            Got Issues?
                        </Button>
                        <Button
                            className="ac-link-button"
                            appearance="link"
                            iconBefore={connyicon}
                            onClick={this.handleDocsLink}
                        >
                            User Guide
                        </Button>
                    </GridColumn>
                </Grid>
            </Page>
        );
    }
}
