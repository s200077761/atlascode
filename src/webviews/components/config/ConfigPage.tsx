import * as React from 'react';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Panel from '@atlaskit/panel';
import Button from '@atlaskit/button';
import { colors } from '@atlaskit/theme';
import { AuthAction, SaveSettingsAction, FeedbackData, SubmitFeedbackAction } from '../../../ipc/configActions';
import { AuthProvider } from '../../../atlclients/authInfo';
import JiraExplorer from './JiraExplorer';
import { ConfigData, emptyConfigData } from '../../../ipc/configMessaging';
import BitbucketExplorer from './BBExplorer';
import StatusBar from './StatusBar';
import DisplayFeedback from './DisplayFeedback';
import { Action, HostErrorMessage } from '../../../ipc/messaging';
import JiraHover from './JiraHover';
import BitbucketContextMenus from './BBContextMenus';
import WelcomeConfig from './WelcomeConfig';
import CustomJQL from './CustomJQL';
import BitbucketIcon from '@atlaskit/logo/dist/esm/BitbucketLogo/Icon';
import ConfluenceIcon from '@atlaskit/logo/dist/esm/ConfluenceLogo/Icon';
import { ButtonGroup } from '@atlaskit/button';
import PipelinesConfig from './PipelinesConfig';
import { WorkingProject } from '../../../config/model';
import { FetchQueryAction } from '../../../ipc/issueActions';
import { ProjectList } from '../../../ipc/issueMessaging';
import Form from '@atlaskit/form';
import JiraSiteProject from './JiraSiteProject';
import BitbucketIssuesConfig from './BBIssuesConfig';
import CreateIssueTriggers from './CreateIssueTriggers';
import ErrorBanner from '../ErrorBanner';

type changeObject = { [key: string]: any };

const panelHeader = (heading: string, subheading: string) =>
    <div>
        <h3 className='inlinePanelHeader'>{heading}</h3>
        <p className='inlinePanelSubheading'>{subheading}</p>
    </div>;

type Emit = AuthAction | SaveSettingsAction | SubmitFeedbackAction | FetchQueryAction | Action;
type Accept = ConfigData | ProjectList | HostErrorMessage;

interface ViewState extends ConfigData {
    isProjectsLoading: boolean;
    isErrorBannerOpen: boolean;
    errorDetails: any;
}

const emptyState: ViewState = {
    ...emptyConfigData,
    isProjectsLoading: false,
    isErrorBannerOpen: false,
    errorDetails: undefined
};

export default class ConfigPage extends WebviewComponent<Emit, Accept, {}, ViewState> {
    private newProjects: WorkingProject[] = [];

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    public onMessageReceived(e: any) {
        switch (e.type) {
            case 'error': {
                this.setState({ isProjectsLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });

                break;
            }
            case 'update': {
                this.setState({ ...e as ConfigData, isErrorBannerOpen: false, errorDetails: undefined });
                break;
            }
            case 'projectList': {
                this.newProjects = (e as ProjectList).availableProjects;
                break;
            }
        }

    }

    public onConfigChange = (change: changeObject, removes?: string[]) => {
        this.postMessage({ action: 'saveSettings', changes: change, removes: removes });
    }

    handleJiraLogin = () => {
        this.handleLogin(AuthProvider.JiraCloud);
    }

    handleJiraLoginStaging = () => {
        this.handleLogin(AuthProvider.JiraCloudStaging);
    }

    handleBBLogin = () => {
        this.handleLogin(AuthProvider.BitbucketCloud);
    }

    handleJiraLogout = () => {
        this.handleLogout(AuthProvider.JiraCloud);
    }

    handleJiraLogoutStaging = () => {
        this.handleLogout(AuthProvider.JiraCloudStaging);
    }

    handleBBLogout = () => {
        this.handleLogout(AuthProvider.BitbucketCloud);
    }

    handleLogin = (provider: string) => {
        this.postMessage({ action: 'login', provider: provider });
    }

    handleLogout = (provider: string) => {
        this.postMessage({ action: 'logout', provider });
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

    loadProjectOptions = (input: string): Promise<any> => {
        this.setState({ isProjectsLoading: true });
        return new Promise(resolve => {
            this.newProjects = [];
            this.postMessage({ action: 'fetchProjects', query: input });
            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if (this.newProjects.length > 0 || (end - start) > 2000) {
                    this.setState({ isProjectsLoading: false });
                    clearInterval(timer);
                    resolve(this.newProjects);
                }
            }, 100);
        });
    }

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    }

    private jiraButton(): any {
        return this.state.isJiraAuthenticated
            ? <ButtonGroup>
                <Button className='ac-button' onClick={this.handleJiraLogin}>Authenticate with another site</Button>
                <Button className='ac-button' onClick={this.handleJiraLogout}>Logout</Button>
            </ButtonGroup>
            : <Button className='ac-button' onClick={this.handleJiraLogin}>Authenticate</Button>;
    }

    private jiraButtonStaging(): any {
        if (!this.state.isStagingEnabled) {
            return;
        }

        return this.state.isJiraStagingAuthenticated
            ? <div>
                <hr />
                <h3>Jira (staging)</h3>
                <ButtonGroup>
                    <Button className='ac-button' onClick={this.handleJiraLoginStaging}>(staging) Authenticate with another site</Button>
                    <Button className='ac-button' onClick={this.handleJiraLogoutStaging}>Logout</Button>
                </ButtonGroup>
            </div>

            : <div>
                <hr />
                <h3>Jira (staging)</h3>
                <Button className='ac-button' onClick={this.handleJiraLoginStaging}>(staging) Authenticate</Button>
            </div>;
    }

    private bitBucketButton(): any {
        if (this.state.isBitbucketAuthenticated) {
            return (<Button className='ac-button'
                onClick={this.handleBBLogout}>Logout</Button>);
        } else {
            return (<Button className='ac-button'
                onClick={this.handleBBLogin}>Authenticate</Button>);
        }
    }

    public render() {
        const bbicon = <BitbucketIcon size="small" iconColor={colors.B200} iconGradientStart={colors.B400} iconGradientStop={colors.B200} />;
        const connyicon = <ConfluenceIcon size="small" iconColor={colors.B200} iconGradientStart={colors.B400} iconGradientStop={colors.B200} />;

        return (
            <Page>
                {this.state.isErrorBannerOpen &&
                    <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                }
                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn>
                        <h1>Atlassian for VSCode</h1>
                    </GridColumn>
                </Grid>

                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn medium={9}>
                        <h2>Settings</h2>
                    </GridColumn>
                </Grid>

                <Grid spacing='comfortable' layout='fixed'>

                    <GridColumn medium={9}>
                        <Form
                            name="jira-explorer-form"
                            onSubmit={(e: any) => { }}
                        >
                            {(frmArgs: any) => {
                                return (<form {...frmArgs.formProps}>
                                    <Panel isDefaultExpanded={true} header={panelHeader('Authentication', 'configure authentication for Jira and Bitbucket')}>
                                        <h3>Jira</h3>
                                        {this.jiraButton()}
                                        {this.jiraButtonStaging()}
                                        <JiraSiteProject configData={this.state} isLoading={this.state.isProjectsLoading} onConfigChange={this.onConfigChange} loadProjectOptions={this.loadProjectOptions} />
                                        <hr />
                                        <h3>Bitbucket</h3>
                                        {this.bitBucketButton()}
                                    </Panel>

                                    <Panel isDefaultExpanded={true} header={panelHeader('Issue Explorer', 'configure the Jira issue explorer')}>
                                        <JiraExplorer configData={this.state} onConfigChange={this.onConfigChange} />
                                    </Panel>

                                    <Panel isDefaultExpanded={true} header={panelHeader('Custom JQL', 'configure custom JQL queries')}>
                                        <CustomJQL siteJqlList={this.state.config.jira.customJql} onConfigChange={this.onConfigChange} jiraAccessToken={this.state.jiraAccessToken}
                                            workingSite={this.state.config.jira.workingSite} sites={this.state.sites} />
                                    </Panel>

                                    <Panel isDefaultExpanded={true} header={panelHeader('Jira Issue Hovers', 'configure hovering for Jira issue keys')}>
                                        <JiraHover configData={this.state} onConfigChange={this.onConfigChange} />
                                    </Panel>

                                    <Panel isDefaultExpanded={true} header={panelHeader('Create Jira Issue Triggers', 'configure creation of Jira issues from TODOs and similar')}>
                                        <CreateIssueTriggers configData={this.state} onConfigChange={this.onConfigChange} />
                                    </Panel>

                                    <Panel isDefaultExpanded={true} header={panelHeader('Pull Request Explorer', 'configure the Bitbucket pull request explorer')}>
                                        <BitbucketExplorer configData={this.state} onConfigChange={this.onConfigChange} />
                                    </Panel>

                                    <Panel isDefaultExpanded={true} header={panelHeader('Pipeline Explorer', 'configure the Bitbucket Pipeline explorer')}>
                                        <PipelinesConfig configData={this.state} onConfigChange={this.onConfigChange} />
                                    </Panel>

                                    <Panel isDefaultExpanded={true} header={panelHeader('Bitbucket Issues Explorer', 'configure the Bitbucket Issues explorer')}>
                                        <BitbucketIssuesConfig configData={this.state} onConfigChange={this.onConfigChange} />
                                    </Panel>

                                    <Panel isDefaultExpanded={true} header={panelHeader('Bitbucket Context Menus', 'configure the Bitbucket context menus in editor')}>
                                        <BitbucketContextMenus configData={this.state} onConfigChange={this.onConfigChange} />
                                    </Panel>

                                    <Panel isDefaultExpanded={true} header={panelHeader('Status Bar', 'configure the status bar display for Jira and Bitbucket')}>
                                        <StatusBar configData={this.state} onConfigChange={this.onConfigChange} />
                                    </Panel>

                                    <Panel isDefaultExpanded={true} header={<div><p className='subheader'>miscellaneous settings</p></div>}>
                                        <WelcomeConfig configData={this.state} onConfigChange={this.onConfigChange} />
                                    </Panel>
                                </form>);
                            }
                            }
                        </Form>
                    </GridColumn>


                    <GridColumn medium={3}>
                        <DisplayFeedback onFeedback={this.handleFeedback} />
                        <div style={{ marginTop: '15px' }}>
                            <Button className='ac-link-button' appearance="link" iconBefore={bbicon} onClick={this.handleSourceLink}>Source Code</Button>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            <Button className='ac-link-button' appearance="link" iconBefore={bbicon} onClick={this.handleIssueLink}>Got Issues?</Button>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            <Button className='ac-link-button' appearance="link" iconBefore={connyicon} onClick={this.handleDocsLink}>User Guide</Button>
                        </div>
                    </GridColumn>
                </Grid>
            </Page>

        );
    }
}
