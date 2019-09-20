import * as React from 'react';
import uuid from 'uuid';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Panel from '@atlaskit/panel';
import Button from '@atlaskit/button';
import { colors } from '@atlaskit/theme';
import { AuthAction, SaveSettingsAction, FeedbackData, SubmitFeedbackAction, LoginAuthAction, FetchJqlDataAction, ConfigTarget } from '../../../ipc/configActions';
import { DetailedSiteInfo, AuthInfo, SiteInfo, ProductBitbucket, ProductJira } from '../../../atlclients/authInfo';
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
import { SettingSource } from '../../../config/model';
import { FetchQueryAction } from '../../../ipc/issueActions';
import { ProjectList } from '../../../ipc/issueMessaging';
import Form from '@atlaskit/form';
import BitbucketIssuesConfig from './BBIssuesConfig';
import MultiOptionList from './MultiOptionList';
import ErrorBanner from '../ErrorBanner';
import { SiteEditor } from './SiteEditor';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import ProductEnabler from './ProductEnabler';
import { Time } from '../../../util/time';
import Select from '@atlaskit/select';

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
    openedSettings: SettingSource;
    tabIndex: number;
    errorDetails: any;
    target: ConfigTarget;
}

const emptyState: ViewState = {
    ...emptyConfigData,
    isProjectsLoading: false,
    isErrorBannerOpen: false,
    tabIndex: 0,
    openedSettings: SettingSource.Default,
    errorDetails: undefined,
    target: ConfigTarget.User,
};

export default class ConfigPage extends WebviewComponent<Emit, Accept, {}, ViewState> {
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
                this.updateTabIndex();
                this.refreshBySwitchingTabs();
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
            case 'jqlData': {
                this.jqlDataMap[e.nonce] = e.data;
                break;
            }
            case 'setOpenedSettings': {
                this.setState({ openedSettings: e.openedSettings });
                this.updateTabIndex();
                this.refreshBySwitchingTabs();
                break;
            }
        }

        return true;

    }

    handleTargetChange = (selected: any) => {
        console.log('target selected', selected);
        this.setState({ target: selected.value });
    }

    handleOpenJson = () => {
        this.postMessage({ action: 'openJson', target: this.state.target });
    }

    public onConfigChange = (change: changeObject, removes?: string[]) => {
        this.postMessage({ action: 'saveSettings', changes: change, removes: removes, target: this.state.target });
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
                    resolve({ ...this.jqlDataMap[nonce] });

                    this.jqlDataMap[nonce] = undefined;
                }
            }, 100);
        });
    }

    //HACK: since panels only support the isDefaultExpanded prop, the tabs need to be cycled to force a refresh of the panels
    refreshBySwitchingTabs = () => {
        const currentTab = this.state.tabIndex;
        if (this.state.tabIndex < 2) {
            this.setState({ tabIndex: currentTab + 1 });
        } else {
            this.setState({ tabIndex: currentTab - 1 });
        }
        this.setState({ tabIndex: currentTab });
    }

    updateTabIndex = () => {
        //If bitbucket or Jira are disabled, the tab we go to has to change since there is a missing tab
        const jiraDisabledModifier = this.state.config.jira.enabled ? 0 : 1;
        const bitbucketDisabledModifier = this.state.config.bitbucket.enabled ? 0 : 1;
        if (this.state.openedSettings === SettingSource.Default
            || this.state.openedSettings === SettingSource.JiraIssue
            || this.state.openedSettings === SettingSource.JiraAuth) {
            this.setState({ tabIndex: 0 });
        } else if (this.state.openedSettings === SettingSource.BBIssue
            || this.state.openedSettings === SettingSource.BBPipeline
            || this.state.openedSettings === SettingSource.BBPullRequest
            || this.state.openedSettings === SettingSource.BBAuth) {
            this.setState({ tabIndex: 1 - jiraDisabledModifier });
        } else {
            this.setState({ tabIndex: 2 - jiraDisabledModifier - bitbucketDisabledModifier });
        }
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
    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    }

    shouldDefaultExpand = (setting: SettingSource, secondSetting?: SettingSource) => {
        if (setting === this.state.openedSettings || secondSetting === this.state.openedSettings) {
            return { isDefaultExpanded: true };
        } else {
            return;
        }
    }

    public render() {
        console.log('state', this.state);
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
                        <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
                            <div><label className='ac-field-label'>save settings to: </label></div>
                            <div className='ac-flex'>
                                <div style={{ width: '160px' }}>
                                    <Select
                                        name="target"
                                        id="target"
                                        className="ac-select-container"
                                        classNamePrefix="ac-select"
                                        options={[{ value: ConfigTarget.User, label: ConfigTarget.User }, { value: ConfigTarget.Workspace, label: ConfigTarget.Workspace }]}
                                        formatOptionLabel={(option: any) => option.label.toUpperCase()}
                                        value={{ value: this.state.target, label: this.state.target }}
                                        onChange={this.handleTargetChange}
                                    />
                                </div>
                                <div className='ac-breadcrumbs' style={{ marginLeft: '10px' }}><a type='button' className='ac-link-button' onClick={this.handleOpenJson}><span>Edit in settings.json</span></a></div>
                            </div>
                        </div>

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
                                    <Tabs selectedIndex={this.state.tabIndex} onSelect={tabIndex => this.setState({ tabIndex })} >
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
                                                <Panel {...this.shouldDefaultExpand(SettingSource.Default, SettingSource.JiraAuth)} header={panelHeader('Authentication', 'configure authentication for Jira')}>
                                                    <SiteEditor
                                                        sites={this.state.jiraSites}
                                                        product={ProductJira}
                                                        handleDeleteSite={this.handleLogout}
                                                        handleSaveSite={this.handleLogin} />
                                                </Panel>

                                                <Panel {...this.shouldDefaultExpand(SettingSource.JiraIssue)} header={panelHeader('Issues and JQL', 'configure the Jira issue explorer, custom JQL and notifications')}>
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
                                                <Panel {...this.shouldDefaultExpand(SettingSource.Default, SettingSource.BBAuth)} header={panelHeader('Authentication', 'configure authentication for Bitbucket')}>
                                                    <SiteEditor
                                                        sites={this.state.bitbucketSites}
                                                        product={ProductBitbucket}
                                                        handleDeleteSite={this.handleLogout}
                                                        handleSaveSite={this.handleLogin}
                                                    />
                                                </Panel>

                                                <Panel {...this.shouldDefaultExpand(SettingSource.BBPullRequest)} header={panelHeader('Pull Requests Explorer', 'configure the pull requests explorer and notifications')}>
                                                    <BitbucketExplorer configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>

                                                <Panel {...this.shouldDefaultExpand(SettingSource.BBPipeline)} header={panelHeader('Bitbucket Pipelines Explorer', 'configure the Bitbucket pipelines explorer and notifications')}>
                                                    <PipelinesConfig configData={this.state} onConfigChange={this.onConfigChange} />
                                                </Panel>

                                                <Panel {...this.shouldDefaultExpand(SettingSource.BBIssue)} header={panelHeader('Bitbucket Issues Explorer', 'configure the Bitbucket Issues explorer and notifications')}>
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
