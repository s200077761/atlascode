import * as React from 'react';
import uuid from 'uuid';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Panel from '@atlaskit/panel';
import Button from '@atlaskit/button';
import { colors } from '@atlaskit/theme';
import { AuthAction, SaveSettingsAction, FeedbackData, SubmitFeedbackAction, LoginAuthAction, FetchJqlDataAction } from '../../../ipc/configActions';
import { DetailedSiteInfo, AuthInfo, SiteInfo } from '../../../atlclients/authInfo';
import JiraExplorer from './JiraExplorer';
import { ConfigData, emptyConfigData } from '../../../ipc/configMessaging';
import BitbucketExplorer from './BBExplorer';
import JiraStatusBar from './JiraStatusBar';
import BBStatusBar from './BBStatusBar';
import DisplayFeedback from './DisplayFeedback';
import { Action, HostErrorMessage } from '../../../ipc/messaging';
import JiraHover from './JiraHover';
import BitbucketContextMenus from './BBContextMenus';
import WelcomeConfig from './WelcomeConfig';
import { BitbucketIcon, ConfluenceIcon } from '@atlaskit/logo';
import PipelinesConfig from './PipelinesConfig';
import { FetchQueryAction } from '../../../ipc/issueActions';
import { ProjectList } from '../../../ipc/issueMessaging';
import Form from '@atlaskit/form';
import BitbucketIssuesConfig from './BBIssuesConfig';
import MultiOptionList from './MultiOptionList';
import ErrorBanner from '../ErrorBanner';
import { BBAuth } from './BBAuth';
import { JiraAuth } from './JiraAuth';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import ProductEnabler from './ProductEnabler';
import { Project } from '../../../jira/jira-client/model/entities';
import { Time } from '../../../util/time';

type changeObject = { [key: string]: any };

const panelHeader = (heading: string, subheading: string) =>
    <div>
        <h3 className='inlinePanelHeader'>{heading}</h3>
        <p className='inlinePanelSubheading'>{subheading}</p>
    </div>;

type Emit = AuthAction | LoginAuthAction | SaveSettingsAction | SubmitFeedbackAction | FetchQueryAction | FetchJqlDataAction | Action;
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
    private nonce: string;
    private newProjects: Project[] = [];
    private jqlDataMap: { [key: string]: any } = {};

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    public onMessageReceived(e: any): boolean {
        switch (e.type) {
            case 'error': {
                this.setState({ isProjectsLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });

                break;
            }
            case 'init': {
                this.setState({ ...e as ConfigData, isErrorBannerOpen: false, errorDetails: undefined });
                break;
            }
            case 'configUpdate': {
                this.setState({ config: e.config, isErrorBannerOpen: false, errorDetails: undefined });
                break;
            }
            case 'sitesAvailableUpdate': {
                this.setState({ jiraSites: e.jiraSites, bitbucketSites: e.bitbucketSites, isErrorBannerOpen: false, errorDetails: undefined });
                break;
            }
            case 'projectMappingUpdate': {
                this.setState({ siteProjectMapping: e.siteProjectMapping, isErrorBannerOpen: false, errorDetails: undefined });
                break;
            }
            case 'projectList': {
                this.newProjects = (e as ProjectList).availableProjects;
                console.log('got new projects', this.newProjects);
                this.nonce = e.nonce;
                break;
            }
            case 'jqlData': {
                this.jqlDataMap[e.nonce] = e.data;
                break;
            }
        }

        return true;

    }

    public onConfigChange = (change: changeObject, removes?: string[]) => {
        this.postMessage({ action: 'saveSettings', changes: change, removes: removes });
    }

    handleDefaultSite = (site: DetailedSiteInfo) => {
        const changes = Object.create(null);
        changes['jira.defaultSite'] = site.id;
        this.onConfigChange(changes);
    }

    handleDefaultProject = (site: DetailedSiteInfo, project: Project) => {
        const changes = Object.create(null);

        const current = this.state.config.jira.defaultProjects;
        current[site.id] = project.key;

        changes['jira.defaultProjects'] = current;
        this.onConfigChange(changes);
    }

    handleFetchJqlOptions = (site: DetailedSiteInfo, path: string): Promise<any> => {
        return new Promise(resolve => {
            const nonce = uuid.v4();
            this.jqlDataMap[nonce] = undefined;

            this.postMessage({ action: 'fetchJqlOptions', path: path, site: site, nonce: nonce });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                const gotData = this.jqlDataMap[nonce] !== undefined;
                const timeIsUp = (end - start) > 15 * Time.SECONDS;

                if (gotData || timeIsUp) {
                    clearInterval(timer);
                    console.log('resolving new jqldata', this.jqlDataMap[nonce]);
                    console.log('got jqlData', gotData);
                    console.log('timeisup', timeIsUp);
                    resolve({ ...this.jqlDataMap[nonce] });

                    this.jqlDataMap[nonce] = undefined;
                }
            }, 100);
        });
    }

    handleLogin = (site: SiteInfo, auth: AuthInfo) => {
        this.postMessage({ action: 'login', siteInfo: site, authInfo: auth });
    }

    handleLogout = (site: DetailedSiteInfo) => {
        this.postMessage({ action: 'logout', siteInfo: site });
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

    loadProjectOptions = (site: DetailedSiteInfo, input: string): Promise<any> => {
        this.setState({ isProjectsLoading: true });
        return new Promise(resolve => {
            this.newProjects = [];

            const nonce = uuid.v4();
            this.postMessage({ action: 'fetchProjects', query: input, site: site, nonce: nonce });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                const gotProjects = (this.newProjects.length > 0 && this.nonce === nonce);
                const timeIsUp = (end - start) > 15 * Time.SECONDS;

                if (gotProjects || timeIsUp) {
                    this.setState({ isProjectsLoading: false });
                    clearInterval(timer);
                    console.log('resolving new projects', this.newProjects);
                    console.log('got projects', gotProjects);
                    console.log('timeisup', timeIsUp);
                    resolve(this.newProjects);
                }
            }, 100);
        });
    }

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
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
                        <div className='ac-vpadding'>
                            <h1>Atlassian for VSCode</h1>
                        </div>
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
                                    <ProductEnabler
                                        jiraEnabled={this.state.config.jira.enabled}
                                        bbEnabled={this.state.config.bitbucket.enabled}
                                        onConfigChange={this.onConfigChange} />
                                    <Tabs>
                                        <TabList>
                                            {this.state.config.jira.enabled &&
                                                <Tab>Jira</Tab>
                                            }
                                            {this.state.config.bitbucket.enabled &&
                                                <Tab>Bitbucket</Tab>
                                            }
                                            <Tab>General</Tab>
                                        </TabList>
                                        {this.state.config.jira.enabled &&
                                            <TabPanel>
                                                <Panel isDefaultExpanded header={panelHeader('Authentication', 'configure authentication for Jira')}>
                                                    <JiraAuth
                                                        defaultSite={this.state.config.jira.defaultSite}
                                                        sites={this.state.jiraSites}
                                                        siteProjectMapping={this.state.siteProjectMapping}
                                                        handleDeleteSite={this.handleLogout}
                                                        handleSaveSite={this.handleLogin}
                                                        handleDefaultSite={this.handleDefaultSite}
                                                        loadProjectOptions={this.loadProjectOptions}
                                                        handleDefaultProject={this.handleDefaultProject} />
                                                    {/* TODO: [VSCODE-509] move default site selection to auth list */}
                                                </Panel>

                                                <Panel header={panelHeader('Issues and JQL', 'configure the Jira issue explorer, custom JQL and notifications')}>
                                                    <JiraExplorer configData={this.state}
                                                        jqlFetcher={this.handleFetchJqlOptions}
                                                        sites={this.state.jiraSites}
                                                        onConfigChange={this.onConfigChange} />
                                                </Panel>

                                                <Panel header={panelHeader('Jira Issue Hovers', 'configure hovering for Jira issue keys')}>
                                                    <JiraHover configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>

                                                <Panel header={panelHeader('Create Jira Issue Triggers', 'configure creation of Jira issues from TODOs and similar')}>
                                                    <MultiOptionList
                                                        onConfigChange={this.onConfigChange}
                                                        enabledConfig={'jira.todoIssues.enabled'}
                                                        optionsConfig={'jira.todoIssues.triggers'}
                                                        enabledValue={this.state.config.jira.todoIssues.enabled}
                                                        enabledDescription={'Prompt to create Jira issues for TODO style comments'}
                                                        promptString={'Add Trigger'}
                                                        options={this.state.config.jira.todoIssues.triggers} />
                                                </Panel>

                                                <Panel header={panelHeader('Status Bar', 'configure the status bar display for Jira')}>
                                                    <JiraStatusBar configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>
                                            </TabPanel>
                                        }

                                        {this.state.config.bitbucket.enabled &&
                                            <TabPanel>
                                                <Panel isDefaultExpanded header={panelHeader('Authentication', 'configure authentication for Bitbucket')}>
                                                    <BBAuth
                                                        sites={this.state.bitbucketSites}
                                                        handleDeleteSite={this.handleLogout}
                                                        handleSaveSite={this.handleLogin}
                                                    />
                                                </Panel>

                                                <Panel header={panelHeader('Pull Requests Explorer', 'configure the pull requests explorer and notifications')}>
                                                    <BitbucketExplorer configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>

                                                <Panel header={panelHeader('Bitbucket Pipelines Explorer', 'configure the Bitbucket Pipelines explorer and notifications')}>
                                                    <PipelinesConfig configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>

                                                <Panel header={panelHeader('Bitbucket Issues Explorer', 'configure the Bitbucket Issues explorer and notifications')}>
                                                    <BitbucketIssuesConfig configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>

                                                <Panel header={panelHeader('Context Menus', 'configure the context menus in editor')}>
                                                    <BitbucketContextMenus configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>
                                                <Panel header={panelHeader('Status Bar', 'configure the status bar display for Bitbucket')}>
                                                    <BBStatusBar configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>
                                            </TabPanel>
                                        }
                                        <TabPanel>
                                            <Panel isDefaultExpanded header={<div><p className='subheader'>miscellaneous settings</p></div>}>
                                                <WelcomeConfig configData={this.state} onConfigChange={this.onConfigChange} />
                                            </Panel>
                                        </TabPanel>
                                    </Tabs>

                                </form>);
                            }
                            }
                        </Form>
                    </GridColumn>


                    <GridColumn medium={3}>
                        <DisplayFeedback userDetails={this.state.feedbackUser} onFeedback={this.handleFeedback} />
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
