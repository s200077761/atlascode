import Button from '@atlaskit/button';
import { Checkbox } from '@atlaskit/checkbox';
import Form, { CheckboxField, HelperMessage } from '@atlaskit/form';
import { BitbucketIcon, ConfluenceIcon } from '@atlaskit/logo';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Panel from '@atlaskit/panel';
import Select from '@atlaskit/select';
import { colors } from '@atlaskit/theme';
import { Filter } from '@atlassianlabs/jira-pi-common-models';
import { merge } from 'merge-anything';
import * as React from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import uuid from 'uuid';
import { AuthInfo, DetailedSiteInfo, ProductBitbucket, ProductJira, SiteInfo } from '../../../atlclients/authInfo';
import { IConfig, SettingSource } from '../../../config/model';
import {
    ConfigTarget,
    FeedbackData,
    FetchJqlDataAction,
    LoginAuthAction,
    LogoutAuthAction,
    SaveSettingsAction,
    SubmitFeedbackAction,
} from '../../../ipc/configActions';
import { ConfigData, emptyConfigData } from '../../../ipc/configMessaging';
import { FetchQueryAction } from '../../../ipc/issueActions';
import { ProjectList } from '../../../ipc/issueMessaging';
import { Action, HostErrorMessage } from '../../../ipc/messaging';
import { ConnectionTimeout } from '../../../util/time';
import { AtlLoader } from '../AtlLoader';
import ErrorBanner from '../ErrorBanner';
import { chain } from '../fieldValidators';
import { WebviewComponent } from '../WebviewComponent';
import BitbucketContextMenus from './BBContextMenus';
import BitbucketExplorer from './BBExplorer';
import BitbucketIssuesConfig from './BBIssuesConfig';
import BBStatusBar from './BBStatusBar';
import DisplayFeedback from './DisplayFeedback';
import JiraExplorer from './JiraExplorer';
import JiraHover from './JiraHover';
import JiraStatusBar from './JiraStatusBar';
import MultiOptionList from './MultiOptionList';
import OnlineCheckConfig from './OnlineCheckConfig';
import PipelinesConfig from './PipelinesConfig';
import ProductEnabler from './ProductEnabler';
import { SiteEditor } from './SiteEditor';
import WelcomeConfig from './WelcomeConfig';

type changeObject = { [key: string]: any };

const panelHeader = (heading: string, subheading: string) => (
    <div>
        <h3 className="inlinePanelHeader">{heading}</h3>
        <p className="inlinePanelSubheading">{subheading}</p>
    </div>
);

type Emit =
    | LoginAuthAction
    | LogoutAuthAction
    | SaveSettingsAction
    | SubmitFeedbackAction
    | FetchQueryAction
    | FetchJqlDataAction
    | Action;
type Accept = ConfigData | ProjectList | HostErrorMessage;

interface ViewState extends ConfigData {
    isProjectsLoading: boolean;
    isErrorBannerOpen: boolean;
    openedSettings: SettingSource;
    tabIndex: number;
    errorDetails: any;
    target: ConfigTarget;
    targetUri: string;
    jiraFilters: { [k: string]: Filter[] };
    jiraFilterSearches: { [k: string]: Filter[] };
    config: IConfig | undefined;
}

const emptyState: ViewState = {
    ...emptyConfigData,
    config: undefined,
    isProjectsLoading: false,
    isErrorBannerOpen: false,
    tabIndex: 0,
    openedSettings: SettingSource.Default,
    errorDetails: undefined,
    target: ConfigTarget.User,
    jiraFilters: {},
    jiraFilterSearches: {},
    targetUri: '',
};

export default class ConfigPage extends WebviewComponent<Emit, Accept, {}, ViewState> {
    private jqlDataMap: { [key: string]: any } = {};
    private filterDataMap: { [key: string]: any } = {};

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    private configForTarget = (target: ConfigTarget, inspect?: any): IConfig => {
        if (!inspect) {
            inspect = this.state.inspect;
        }
        /* NOTE: we use merge-anything here because Object.assign and spread operators delete entries
           in the target object if they are undefined in the source object. They also do shallow copies
           which just contain refs to the original objects.
           merge-anything is a lot less heavy than all the other merge libs including lodash and doesn't
           mutate the inputs as most other libs do.
        */
        switch (target) {
            case ConfigTarget.User: {
                return merge(inspect['default'], inspect['user']) as IConfig;
            }
            case ConfigTarget.Workspace: {
                return merge(inspect['default'], inspect['workspace']) as IConfig;
            }
            case ConfigTarget.WorkspaceFolder: {
                return merge(inspect['default'], inspect['workspacefolder']) as IConfig;
            }
        }
    };

    public onMessageReceived(e: any): boolean {
        switch (e.type) {
            case 'error': {
                this.setState({ isProjectsLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });

                break;
            }
            case 'init': {
                this.setState({
                    ...(e as ConfigData),
                    config: this.configForTarget(e.target, e.inspect),
                    jiraFilters: e.jiraFilters,
                    isErrorBannerOpen: false,
                    errorDetails: undefined,
                });
                this.updateTabIndex();
                this.refreshBySwitchingTabs();
                break;
            }
            case 'configUpdate': {
                this.setState({
                    inspect: e.inspect,
                    config: this.configForTarget(this.state.target, e.inspect),
                    isErrorBannerOpen: false,
                    errorDetails: undefined,
                });
                break;
            }
            case 'sitesAvailableUpdate': {
                this.setState({
                    jiraSites: e.jiraSites,
                    bitbucketSites: e.bitbucketSites,
                    isErrorBannerOpen: false,
                    errorDetails: undefined,
                });
                break;
            }
            case 'jqlData': {
                this.jqlDataMap[e.nonce] = e.data;
                break;
            }
            case 'filterData': {
                let filters = this.state.jiraFilters;
                if (!filters) {
                    filters = {};
                }
                filters[e.siteId] = e.data;
                this.setState({ jiraFilters: filters });
                break;
            }
            case 'filterSearchData': {
                this.filterDataMap[e.nonce] = e.data;
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
        const config = this.configForTarget(selected.value);
        this.setState({ target: selected.value, targetUri: selected.uri, config: config });
        const change = Object.create(null);
        change['configurationTarget'] = selected.value;

        this.postMessage({
            action: 'saveSettings',
            changes: change,
            removes: undefined,
            target: ConfigTarget.User,
            targetUri: '',
        });
    };

    handleOpenJson = () => {
        this.postMessage({ action: 'openJson', target: this.state.target });
    };

    public onConfigChange = (change: changeObject, removes?: string[]) => {
        this.postMessage({
            action: 'saveSettings',
            changes: change,
            removes: removes,
            target: this.state.target,
            targetUri: this.state.targetUri,
        });
    };

    handleFetchJqlOptions = (site: DetailedSiteInfo, path: string): Promise<any> => {
        return new Promise((resolve) => {
            const nonce = uuid.v4();
            this.jqlDataMap[nonce] = undefined;

            this.postMessage({ action: 'fetchJqlOptions', path: path, site: site, nonce: nonce });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                const gotData = this.jqlDataMap[nonce] !== undefined;
                const timeIsUp = end - start > ConnectionTimeout;

                if (gotData || timeIsUp) {
                    clearInterval(timer);
                    resolve({ ...this.jqlDataMap[nonce] });

                    this.jqlDataMap[nonce] = undefined;
                }
            }, 100);
        });
    };

    handleFetchFilterOptions = (site: DetailedSiteInfo) => {
        this.postMessage({ action: 'fetchJiraFilterOptions', site: site });
    };

    handleSearchFilterOptions = (site: DetailedSiteInfo, query: string): Promise<Filter[]> => {
        const nonce = uuid.v4();
        this.jqlDataMap[nonce] = undefined;

        return new Promise((resolve) => {
            this.postMessage({ action: 'fetchSearchJiraFilterOptions', site: site, query: query, nonce: nonce });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                const gotData = this.filterDataMap[nonce] !== undefined;
                const timeIsUp = end - start > ConnectionTimeout;

                if (gotData || timeIsUp) {
                    clearInterval(timer);
                    resolve(this.filterDataMap[nonce]);
                    this.filterDataMap[nonce] = undefined;
                }
            }, 100);
        });
    };

    //HACK: since panels only support the isDefaultExpanded prop, the tabs need to be cycled to force a refresh of the panels
    refreshBySwitchingTabs = () => {
        const currentTab = this.state.tabIndex;
        if (this.state.tabIndex < 2) {
            this.setState({ tabIndex: currentTab + 1 });
        } else {
            this.setState({ tabIndex: currentTab - 1 });
        }
        this.setState({ tabIndex: currentTab });
    };

    updateTabIndex = () => {
        //If bitbucket or Jira are disabled, the tab we go to has to change since there is a missing tab
        const jiraDisabledModifier = this.state.config && this.state.config.jira.enabled ? 0 : 1;
        const bitbucketDisabledModifier = this.state.config && this.state.config.bitbucket.enabled ? 0 : 1;
        if (
            this.state.openedSettings === SettingSource.Default ||
            this.state.openedSettings === SettingSource.JiraIssue ||
            this.state.openedSettings === SettingSource.JiraAuth
        ) {
            this.setState({ tabIndex: 0 });
        } else if (
            this.state.openedSettings === SettingSource.BBIssue ||
            this.state.openedSettings === SettingSource.BBPipeline ||
            this.state.openedSettings === SettingSource.BBPullRequest ||
            this.state.openedSettings === SettingSource.BBAuth
        ) {
            this.setState({ tabIndex: 1 - jiraDisabledModifier });
        } else {
            this.setState({ tabIndex: 2 - jiraDisabledModifier - bitbucketDisabledModifier });
        }
    };

    handleLogin = (site: SiteInfo, auth: AuthInfo) => {
        this.postMessage({ action: 'login', siteInfo: site, authInfo: auth });
    };

    handleEdit = (site: DetailedSiteInfo, auth: AuthInfo) => {
        this.postMessage({ action: 'edit', detailedSiteInfo: site, authInfo: auth });
    };

    handleLogout = (site: DetailedSiteInfo) => {
        this.postMessage({ action: 'logout', detailedSiteInfo: site });
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
    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    };

    handleTunnelChange = (e: any) => {
        const changes = Object.create(null);
        changes[e.target.value] = e.target.checked;

        this.onConfigChange(changes);
    };

    shouldDefaultExpand = (setting: SettingSource, secondSetting?: SettingSource) => {
        if (setting === this.state.openedSettings || secondSetting === this.state.openedSettings) {
            return { isDefaultExpanded: true };
        } else {
            return;
        }
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
        const snippetTip = (
            <div className="ac-vpadding">
                <p>
                    <strong>Tip:</strong> You can have issue keys auto-added to your commit messages using{' '}
                    <a type="button" className="ac-link-button" href="https://bitbucket.org/snippets/atlassian/qedp7d">
                        <span>our prepare-commit-msg hook</span>
                    </a>
                </p>
            </div>
        );
        // Note: we will figure out what can be put on the resource level in the near future
        let targetOptions = [];
        // if (this.state.workspaceFolders.length > 1) {
        //     targetOptions = [{ label: '', options: [{ value: ConfigTarget.User, label: ConfigTarget.User, uri: "" }, { value: ConfigTarget.Workspace, label: ConfigTarget.Workspace, uri: "" }] }
        //         , {
        //         label: 'workspace folders', options: this.state.workspaceFolders.map(folder => {
        //             return { value: ConfigTarget.WorkspaceFolder, label: folder.name, uri: folder.uri };
        //         })
        //     }];
        // } else {
        targetOptions = [
            { value: ConfigTarget.User, label: ConfigTarget.User, uri: '' },
            { value: ConfigTarget.Workspace, label: ConfigTarget.Workspace, uri: '' },
        ];
        //}

        if ((!this.state.config || Object.keys(this.state.config).length < 1) && !this.state.isErrorBannerOpen) {
            this.postMessage({ action: 'refresh' });
            return <AtlLoader />;
        }
        return (
            <Page>
                {this.state.isErrorBannerOpen && (
                    <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                )}
                <Grid spacing="comfortable" layout="fixed">
                    <GridColumn>
                        <div className="ac-vpadding">
                            <h1>Atlassian for VS Code</h1>
                        </div>
                    </GridColumn>
                </Grid>

                <Grid spacing="comfortable" layout="fixed">
                    <GridColumn medium={9}>
                        <h2>Settings</h2>
                        <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
                            <div>
                                <label className="ac-field-label">save settings to: </label>
                            </div>
                            <div className="ac-flex">
                                <div style={{ width: '160px' }}>
                                    <Select
                                        name="target"
                                        id="target"
                                        className="ac-select-container"
                                        classNamePrefix="ac-select"
                                        options={targetOptions}
                                        formatOptionLabel={(option: any) => option.label.toUpperCase()}
                                        value={{ value: this.state.target, label: this.state.target }}
                                        onChange={this.handleTargetChange}
                                    />
                                </div>
                                <div className="ac-breadcrumbs" style={{ marginLeft: '10px' }}>
                                    <a type="button" className="ac-link-button" onClick={this.handleOpenJson}>
                                        <span>Edit in settings.json</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </GridColumn>
                </Grid>
                <Grid spacing="comfortable" layout="fixed">
                    <GridColumn medium={9}>
                        <Form name="jira-explorer-form" onSubmit={(e: any) => {}}>
                            {(frmArgs: any) => {
                                return (
                                    <form {...frmArgs.formProps}>
                                        {this.state.showTunnelOption && (
                                            <div>
                                                <CheckboxField
                                                    name="tunnel-enabled"
                                                    id="tunnel-enabled"
                                                    value="enableHttpsTunnel"
                                                >
                                                    {(fieldArgs: any) => {
                                                        return (
                                                            <Checkbox
                                                                {...fieldArgs.fieldProps}
                                                                label="Enable https tunneling for proxies"
                                                                onChange={chain(
                                                                    fieldArgs.fieldProps.onChange,
                                                                    this.handleTunnelChange
                                                                )}
                                                                isChecked={this.state.config!.enableHttpsTunnel}
                                                            />
                                                        );
                                                    }}
                                                </CheckboxField>
                                                <HelperMessage>
                                                    Looks like you're behind a proxy. You may need to enable https
                                                    tunneling for the extension to work.
                                                </HelperMessage>
                                            </div>
                                        )}
                                        <ProductEnabler
                                            jiraEnabled={this.state.config!.jira.enabled}
                                            bbEnabled={this.state.config!.bitbucket.enabled}
                                            onConfigChange={this.onConfigChange}
                                        />
                                        <Tabs
                                            selectedIndex={this.state.tabIndex}
                                            onSelect={(tabIndex) => this.setState({ tabIndex })}
                                        >
                                            <TabList>
                                                {this.state.config!.jira.enabled && <Tab>Jira</Tab>}
                                                {this.state.config!.bitbucket.enabled && <Tab>Bitbucket</Tab>}
                                                <Tab>General</Tab>
                                            </TabList>
                                            {this.state.config!.jira.enabled && (
                                                <TabPanel>
                                                    <Panel
                                                        {...this.shouldDefaultExpand(
                                                            SettingSource.Default,
                                                            SettingSource.JiraAuth
                                                        )}
                                                        header={panelHeader(
                                                            'Authentication',
                                                            'configure authentication for Jira'
                                                        )}
                                                    >
                                                        <SiteEditor
                                                            sites={this.state.jiraSites}
                                                            product={ProductJira}
                                                            isRemote={this.state.isRemote}
                                                            handleDeleteSite={this.handleLogout}
                                                            handleEditSite={this.handleEdit}
                                                            handleSaveSite={this.handleLogin}
                                                        />
                                                    </Panel>

                                                    <Panel
                                                        {...this.shouldDefaultExpand(SettingSource.JiraIssue)}
                                                        header={panelHeader(
                                                            'Jira Issues Explorer',
                                                            'configure the Jira issues explorer, custom JQL and notifications'
                                                        )}
                                                    >
                                                        {snippetTip}
                                                        <JiraExplorer
                                                            config={this.state.config!}
                                                            jqlFetcher={this.handleFetchJqlOptions}
                                                            jiraFilterFetcher={this.handleFetchFilterOptions}
                                                            jiraFilterSearcher={this.handleSearchFilterOptions}
                                                            sites={this.state.jiraSites.map(
                                                                (siteAuth) => siteAuth.site
                                                            )}
                                                            filters={this.state.jiraFilters}
                                                            filterSearches={this.state.jiraFilterSearches}
                                                            onConfigChange={this.onConfigChange}
                                                        />
                                                    </Panel>

                                                    <Panel
                                                        header={panelHeader(
                                                            'Jira Issue Hovers',
                                                            'configure hovering for Jira issue keys'
                                                        )}
                                                    >
                                                        <JiraHover
                                                            config={this.state.config!}
                                                            onConfigChange={this.onConfigChange}
                                                        />
                                                    </Panel>

                                                    <Panel
                                                        header={panelHeader(
                                                            'Create Jira Issue Triggers',
                                                            'configure creation of Jira issues from TODOs and similar'
                                                        )}
                                                    >
                                                        <MultiOptionList
                                                            onConfigChange={this.onConfigChange}
                                                            enabledConfig={'jira.todoIssues.enabled'}
                                                            optionsConfig={'jira.todoIssues.triggers'}
                                                            enabledValue={this.state.config!.jira.todoIssues.enabled}
                                                            enabledDescription={
                                                                'Prompt to create Jira issues for TODO style comments'
                                                            }
                                                            promptString={'Add Trigger'}
                                                            options={this.state.config!.jira.todoIssues.triggers}
                                                        />
                                                    </Panel>

                                                    <Panel
                                                        header={panelHeader(
                                                            'Status Bar',
                                                            'configure the status bar display for Jira'
                                                        )}
                                                    >
                                                        <JiraStatusBar
                                                            config={this.state.config!}
                                                            onConfigChange={this.onConfigChange}
                                                        />
                                                    </Panel>
                                                </TabPanel>
                                            )}

                                            {this.state.config!.bitbucket.enabled && (
                                                <TabPanel>
                                                    <Panel
                                                        {...this.shouldDefaultExpand(
                                                            SettingSource.Default,
                                                            SettingSource.BBAuth
                                                        )}
                                                        header={panelHeader(
                                                            'Authentication',
                                                            'configure authentication for Bitbucket'
                                                        )}
                                                    >
                                                        <SiteEditor
                                                            sites={this.state.bitbucketSites}
                                                            product={ProductBitbucket}
                                                            isRemote={this.state.isRemote}
                                                            handleDeleteSite={this.handleLogout}
                                                            handleEditSite={this.handleEdit}
                                                            handleSaveSite={this.handleLogin}
                                                        />
                                                    </Panel>

                                                    <Panel
                                                        {...this.shouldDefaultExpand(SettingSource.BBPullRequest)}
                                                        header={panelHeader(
                                                            'Bitbucket Pull Requests Explorer',
                                                            'configure the Bitbucket pull requests explorer and notifications'
                                                        )}
                                                    >
                                                        <BitbucketExplorer
                                                            config={this.state.config!}
                                                            onConfigChange={this.onConfigChange}
                                                        />
                                                    </Panel>

                                                    <Panel
                                                        {...this.shouldDefaultExpand(SettingSource.BBPipeline)}
                                                        header={panelHeader(
                                                            'Bitbucket Pipelines Explorer',
                                                            'configure the Bitbucket pipelines explorer and notifications'
                                                        )}
                                                    >
                                                        <PipelinesConfig
                                                            config={this.state.config!}
                                                            onConfigChange={this.onConfigChange}
                                                        />
                                                    </Panel>

                                                    <Panel
                                                        {...this.shouldDefaultExpand(SettingSource.BBIssue)}
                                                        header={panelHeader(
                                                            'Bitbucket Issues Explorer',
                                                            'configure the Bitbucket issues explorer and notifications'
                                                        )}
                                                    >
                                                        <BitbucketIssuesConfig
                                                            config={this.state.config!}
                                                            onConfigChange={this.onConfigChange}
                                                        />
                                                    </Panel>

                                                    <Panel
                                                        header={panelHeader(
                                                            'Context Menus',
                                                            'configure the context menus in editor'
                                                        )}
                                                    >
                                                        <BitbucketContextMenus
                                                            config={this.state.config!}
                                                            onConfigChange={this.onConfigChange}
                                                        />
                                                    </Panel>
                                                    <Panel
                                                        header={panelHeader(
                                                            'Status Bar',
                                                            'configure the status bar display for Bitbucket'
                                                        )}
                                                    >
                                                        <BBStatusBar
                                                            config={this.state.config!}
                                                            onConfigChange={this.onConfigChange}
                                                        />
                                                    </Panel>
                                                </TabPanel>
                                            )}
                                            <TabPanel>
                                                <Panel
                                                    isDefaultExpanded
                                                    header={
                                                        <div>
                                                            <p className="subheader">miscellaneous settings</p>
                                                        </div>
                                                    }
                                                >
                                                    <WelcomeConfig
                                                        config={this.state.config!}
                                                        onConfigChange={this.onConfigChange}
                                                    />
                                                </Panel>
                                                <Panel
                                                    isDefaultExpanded
                                                    header={panelHeader(
                                                        'Connectivity',
                                                        'change what URLs are pinged to determine online status'
                                                    )}
                                                >
                                                    <OnlineCheckConfig
                                                        config={this.state.config!}
                                                        onConfigChange={this.onConfigChange}
                                                    />
                                                </Panel>
                                            </TabPanel>
                                        </Tabs>
                                    </form>
                                );
                            }}
                        </Form>
                    </GridColumn>

                    <GridColumn medium={3}>
                        <DisplayFeedback userDetails={this.state.feedbackUser} onFeedback={this.handleFeedback} />
                        <div style={{ marginTop: '15px' }}>
                            <Button
                                className="ac-link-button"
                                appearance="link"
                                iconBefore={bbicon}
                                onClick={this.handleSourceLink}
                            >
                                Source Code
                            </Button>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            <Button
                                className="ac-link-button"
                                appearance="link"
                                iconBefore={bbicon}
                                onClick={this.handleIssueLink}
                            >
                                Got Issues?
                            </Button>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            <Button
                                className="ac-link-button"
                                appearance="link"
                                iconBefore={connyicon}
                                onClick={this.handleDocsLink}
                            >
                                User Guide
                            </Button>
                        </div>
                    </GridColumn>
                </Grid>
            </Page>
        );
    }
}
